import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { VoxelToRASConverter } from './voxelToRASConverter';
import { SkeletonWriter, Vertex, Edge } from './skeletonWriter';
import { TrkHeader, TrkHeaderProcessor } from './trkHeader';

// Define the ProcessState interface to track chunk processing state
export interface ProcessState {
  byteOffset: number;
  trackNumber: number;
  offset: number;
}

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
      // Read the header using TrkHeaderProcessor and store it in the globalHeader
      this.globalHeader = TrkHeaderProcessor.readTrkHeader(buffer);
      TrkHeaderProcessor.printTrkHeader(this.globalHeader);
    } catch (error) {
      console.error('Error streaming or processing the TRK file header:', error);
    }
  }

  async processTrackData(
    url: string,
    byteOffset: number,
    chunkSize: number,
    trackNumber: number
): Promise<ProcessState> {
    if (!this.globalHeader) {
        console.error('Error: Global header is not initialized.');
        return { byteOffset, trackNumber, offset: 0 };
    }

    const outputFilePath = path.join(__dirname, 'track_data.txt');
    const writeStream = fs.createWriteStream(outputFilePath, { flags: 'a' });

    let offset = 0;
    let trackProcessedCount = 0; // Track how many tracks have been processed
    const maxTracksToProcess = 300; // We want to process the first 100 tracks

    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    let vertexIndex = 0;

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'Range': `bytes=${byteOffset}-${byteOffset + chunkSize - 1}`,
            },
        });

        const buffer = Buffer.from(response.data);
        const dataView = new DataView(buffer.buffer);

        while (trackProcessedCount < maxTracksToProcess && offset < buffer.byteLength) {
            // Read the number of points in the track (first 4 bytes)
            const n_points = dataView.getInt32(offset, true);
            offset += 4;

            // Process each point in the track (x, y, z - 12 bytes per point)
            for (let i = 0; i < n_points; i++) {
                const x = dataView.getFloat32(offset, true);
                const y = dataView.getFloat32(offset + 4, true);
                const z = dataView.getFloat32(offset + 8, true);
                offset += 12;

                const voxelPoint: [number, number, number] = [x, y, z];
                const rasPoint = VoxelToRASConverter.voxelToRAS(voxelPoint, this.globalHeader.vox_to_ras);

                // Log the conversion result
                // console.log(`Voxel: [${x}, ${y}, ${z}] -> RAS: [${rasPoint[0]}, ${rasPoint[1]}, ${rasPoint[2]}]`);
                writeStream.write(`\nVoxel: [${x}, ${y}, ${z}] -> RAS: [${rasPoint[0]}, ${rasPoint[1]}, ${rasPoint[2]}]`);

                // Add vertex data
                vertices.push({ x: rasPoint[0], y: rasPoint[1], z: rasPoint[2] });

                // Add edge data
                if (i > 0) {
                    edges.push({ vertex1: vertexIndex - 1, vertex2: vertexIndex });
                }
                vertexIndex++;
            }

            trackProcessedCount++; // Increment the number of processed tracks
            trackNumber++;

            // Write the skeleton data after processing 100 tracks
            if (trackProcessedCount >= maxTracksToProcess) {
                const outputDirectory = path.resolve(__dirname, '..', 'src');
                const { binaryFilePath, propInfoFilePath, skeletonInfoFilePath } = SkeletonWriter.generateSkeletonFilePaths(outputDirectory);

                SkeletonWriter.writeSkeleton(vertices, edges, binaryFilePath);
                SkeletonWriter.writePropInfo(propInfoFilePath);
                SkeletonWriter.writeSkeletonInfo(skeletonInfoFilePath);

                console.log(`Processed ${maxTracksToProcess} tracks and wrote skeleton and info files.`);
            }
        }

        writeStream.end();
        byteOffset += buffer.byteLength; // Move to the next chunk

        // Return the updated state to continue processing in the next chunk
        return { byteOffset, trackNumber, offset };
    } catch (error) {
        console.error('Error fetching or processing track data:', error);
        return { byteOffset, trackNumber, offset };
    }
}


  
}
