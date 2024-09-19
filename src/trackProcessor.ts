import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { VoxelToRASConverter } from './voxelToRASConverter';
import { SkeletonWriter, Vertex, Edge } from './skeletonWriter';
import { TrkHeader, TrkHeaderProcessor } from './trkHeader';

export interface ProcessState {
    byteOffset: number;
    trackNumber: number;
    offset: number;
}

type Orientation = [number, number, number];

export class TrackProcessor {
    globalHeader: TrkHeader | null;

    constructor(globalHeader: TrkHeader | null = null) {
        this.globalHeader = globalHeader;
    }

    async streamAndProcessHeader(url: string, start: number, end: number) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'Range': `bytes=${start}-${end}`,
                },
            });
            const buffer = Buffer.from(response.data);
            this.globalHeader = TrkHeaderProcessor.readTrkHeader(buffer);
            TrkHeaderProcessor.printTrkHeader(this.globalHeader);
        } catch (error) {
            console.error('Error streaming or processing the TRK file header:', error);
        }
    }

    static computeOrientation(points: number[][]): number[][] {
        // Step 1: Compute directed orientation of each edge
        let orient: number[][] = points.slice(1).map((point, i) => {
            return [
                point[0] - points[i][0],
                point[1] - points[i][1],
                point[2] - points[i][2]
            ];
        });

        // Step 2: Compute orientation for each vertex
        let originalOrient = [...orient];
        orient = [
            ...originalOrient.slice(0, 1), // First vertex (only one edge)
            ...originalOrient.slice(0, -1).map((o, i) => {
                return [
                    o[0] + orient[i + 1][0], // x
                    o[1] + orient[i + 1][1], // y
                    o[2] + orient[i + 1][2]  // z
                ];
            }),
            ...originalOrient.slice(-1) // Last vertex (only one edge)
        ];

        // Step 3: Normalize orientation vectors to unit length
        orient = orient.map((o: number[]) => {
            const length = Math.sqrt(o[0] * o[0] + o[1] * o[1] + o[2] * o[2]);
            const normalizedLength = Math.max(length, 1e-12); // Avoid division by 0
            return [o[0] / normalizedLength, o[1] / normalizedLength, o[2] / normalizedLength] as Orientation;
        });


        return orient;
    }

    async processTrackData( randomTrackNumbers: number[], trackNumber: number, filePath: string): Promise<{ processState: ProcessState; timestamp: string }> {
        // Get the current date and time
        const now = new Date();

        // Format the timestamp as YYYYMMDD_HHMMSS
        const timestamp = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);


        if (!this.globalHeader) {
            console.error('Error: Global header is not initialized.');
            return  { processState: { byteOffset: 0, trackNumber, offset: 0 }, timestamp };
        }

        const outputFilePath = path.join(__dirname, 'track_data.txt');
        const writeStream = fs.createWriteStream(outputFilePath, { flags: 'a' });

        const maxTracksToProcess = randomTrackNumbers.length;
        const vertices: Vertex[] = [];
        const edges: Edge[] = [];
        const orientations: number[][] = [];
        let trackProcessedCount = 0;
        let vertexIndex = 0;

        // let start = 1000;
        // let end = 1116228;

        try {
            // const response = await axios.get(url, {
            //     responseType: 'arraybuffer',
            //     // headers: {
            //     //     'Range': `bytes=${start}-${end}`,
            //     // },
            // });

            // const buffer = Buffer.from(response.data);
            // const dataView = new DataView(buffer.buffer);
            // const dataView = this.loadFileBuffer('/Users/shrutiv/MyDocuments/GitHub/d4ac43bd-6896-4adf-a911-82edbea21f67.trk');

            const { dataView, buffer } = await this.loadFileBuffer(filePath);
            console.log('Buffer length:', buffer.length);
            console.log('DataView length:', dataView.byteLength);

            let offset = 1000;

            while (trackProcessedCount < maxTracksToProcess && offset < buffer.byteLength) {
                // Read the number of points in the track (first 4 bytes)
                const n_points = dataView.getInt32(offset, true); // true indicates little-endian byte order.
                offset += 4;

                writeStream.write(`Track ${trackNumber} processed, number of points: ${n_points}\n`);

                // Only process the track if it is in the random track numbers
                if (randomTrackNumbers.includes(trackNumber)) {
                    // Process each point in the track (x, y, z -> 12 bytes per point)
                    const points: number[][] = [];
                    for (let i = 0; i < n_points; i++) {
                        const x = dataView.getFloat32(offset, true);
                        const y = dataView.getFloat32(offset + 4, true);
                        const z = dataView.getFloat32(offset + 8, true);
                        offset += 12;
                        points.push([x, y, z]);

                        const voxelPoint: [number, number, number] = [x, y, z];
                        const affine =
                            VoxelToRASConverter.getAffineToRasmm(this.globalHeader);
                        const rasPoint = VoxelToRASConverter.applyAffineMatrix(voxelPoint, affine);

                        // Add vertex data
                        vertices.push({ x: rasPoint[0], y: rasPoint[1], z: rasPoint[2] });

                        // Add edge data
                        if (i > 0) {
                            edges.push({ vertex1: vertexIndex - 1, vertex2: vertexIndex });
                        }
                        vertexIndex++;
                    }

                    // Compute and add orientation for the tract
                    const orient = TrackProcessor.computeOrientation(points);
                    orientations.push(...orient);

                    trackProcessedCount++; // Increment the number of processed tracks

                    if (trackProcessedCount >= maxTracksToProcess) {
                        const outputDirectory = path.resolve(__dirname, '..', 'src');
                        const { binaryFilePath, propInfoFilePath, skeletonInfoFilePath } = SkeletonWriter.generateSkeletonFilePaths(outputDirectory, timestamp);

                        SkeletonWriter.writeSkeleton(vertices, edges, orientations, binaryFilePath);
                        SkeletonWriter.writePropInfo(propInfoFilePath);
                        SkeletonWriter.writeSkeletonInfo(skeletonInfoFilePath);

                        console.log(`Processed ${maxTracksToProcess} random tracks and wrote skeleton and info files.`);

                        SkeletonWriter.uploadSkeletonFilePathsToS3(outputDirectory, timestamp);

                        console.log(`Uploaded tracks to S3.`)

                        break;
                    }
                } else {
                    offset += n_points * 12; // Skip the track data if it's not in the selected tracks
                }

                trackNumber++;
            }

            writeStream.end();
            return  { processState: { byteOffset: 0, trackNumber, offset: 0 }, timestamp };

        } catch (error) {

            console.error('Error fetching or processing track data:', error);
            return  { processState: { byteOffset: 0, trackNumber, offset: 0 }, timestamp };

        }
    }

    getRandomTrackIndices(totalTracks: number, numTracks: number): number[] {
        const trackIndices = Array.from({ length: totalTracks }, (_, i) => i + 1); // Create an array of track numbers
        for (let i = trackIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [trackIndices[i], trackIndices[j]] = [trackIndices[j], trackIndices[i]]; // Shuffle array
        }
        return trackIndices.slice(0, numTracks); // Return the first `numTracks` tracks
    }

    loadFileBuffer(filePath: string) {
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            // Handle URL loading with axios
            return axios.get(filePath, { responseType: 'arraybuffer' })
                .then(response => {
                    const buffer = Buffer.from(response.data);
                    const dataView = new DataView(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
                    console.log('Data loaded from URL successfully.');
                    return {
                        dataView,
                        buffer
                    };
                })
                .catch(error => {
                    console.error('Failed to load file from URL:', error);
                    throw error;
                });
        } else {
        // Handle local file loading with fs
            try {
                const absolutePath = path.resolve(filePath);
                const buffer = fs.readFileSync(absolutePath);
                const dataView = new DataView(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
                console.log('Data loaded from local file successfully.');
                return {
                    dataView,
                    buffer
                };
            } catch (error) {
                console.error('Failed to load local file:', error);
                throw error;
            }
        }
    }

}
