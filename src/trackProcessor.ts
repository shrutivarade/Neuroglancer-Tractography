import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { VoxelToRASConverter } from './voxelToRASConverter';
import { SkeletonWriter, Vertex, Edge } from './skeletonWriter';
import { TrkHeader, TrkHeaderProcessor } from './trkHeader';

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

  // Efficient data processing, with proper handling of the last chunk
  async processTrackData(
    url: string,
    start: number,
    chunkSize: number = 10 * 1024 * 1024,
    trackToProcess: number
  ) {
    if (!this.globalHeader) {
      console.error('Error: Global header is not initialized.');
      return;
    }

    const outputFilePath = path.join(__dirname, 'track_data.txt');
    fs.writeFileSync(outputFilePath, ''); // Clear the file at the start

    let byteOffset = start;
    let trackNumber = 1;
    let track108Processed = false;
    let totalFileSize: number | null = null;

    try {
      while (true) {
        // First request for data chunk
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          headers: {
            'Range': `bytes=${byteOffset}-${byteOffset + chunkSize - 1}`,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        // Determine the total file size from the 'Content-Range' header
        if (totalFileSize === null && response.headers['content-range']) {
          const contentRange = response.headers['content-range'];
          const match = contentRange.match(/\/(\d+)$/);
          if (match) {
            totalFileSize = parseInt(match[1], 10);
            console.log(`Total file size: ${totalFileSize} bytes`);
          }
        }

        const buffer = Buffer.from(response.data);

        // Handle the case when there is no more data
        if (buffer.length === 0) {
          console.log('No more data to read.');
          break;
        }

        console.log(`\nReceived ${buffer.byteLength} bytes starting from byte ${byteOffset}`);

        const writeStream = fs.createWriteStream(outputFilePath, { flags: 'a' });
        let offset = 0;

        const vertices: Vertex[] = [];
        const edges: Edge[] = [];
        let vertexIndex = 0;

        while (offset < buffer.length) {
          const n_points = buffer.readInt32LE(offset); // Read the number of points
          offset += 4;

          if (n_points <= 0) {
            console.error(`Error: Invalid number of points in track #${trackNumber}`);
            break;
          }

          // Log track data to the file
          writeStream.write(`Track ${trackNumber} processed, number of points: ${n_points}\n`);

          // Process track 108 if encountered and not yet processed
          if (trackNumber === trackToProcess && !track108Processed) {
            console.log(`Processing track ${trackToProcess} with ${n_points} points.`);

            // Read points and convert voxel to RAS
            for (let i = 0; i < n_points; i++) {
              const x = buffer.readFloatLE(offset);
              const y = buffer.readFloatLE(offset + 4);
              const z = buffer.readFloatLE(offset + 8);
              offset += 12;

              const voxelPoint: [number, number, number] = [x, y, z];
              const rasPoint = VoxelToRASConverter.voxelToRAS(voxelPoint, this.globalHeader.vox_to_ras);

              // Add vertex data
              vertices.push({ x: rasPoint[0], y: rasPoint[1], z: rasPoint[2] });

              // Add edge data
              if (i > 0) {
                edges.push({ vertex1: vertexIndex - 1, vertex2: vertexIndex });
              }
              vertexIndex++;
            }

            // // Write skeleton and info for track 108
            // const binaryOutputFilePath = `neuroglancer_skeleton_track_${trackToProcess}.bin`;
            // SkeletonWriter.writeSkeleton(vertices, edges, binaryOutputFilePath);

            // const infoOutputFilePath = `neuroglancer_skeleton_info_track_${trackToProcess}.json`;
            // SkeletonWriter.writeSkeletonInfo(vertices.length, edges.length, infoOutputFilePath);


            const outputDirectory = __dirname; // You can change this to any directory

            // Generate paths for skeleton files
            const { binaryFilePath } = SkeletonWriter.generateSkeletonFilePaths(trackToProcess, outputDirectory);

            // Write the skeleton binary data
            SkeletonWriter.writeSkeleton(vertices, edges, binaryFilePath);

            // Write the skeleton metadata (always to "info.json")
            SkeletonWriter.writeSkeletonInfo(vertices.length, edges.length, outputDirectory);


            console.log(`Track ${trackToProcess} skeleton and info files written.`);
            track108Processed = true; // Mark as processed
          } else {
            offset += n_points * 12; // Skip this track's data
          }

          trackNumber++;
        }

        writeStream.end();
        byteOffset += buffer.byteLength; // Move to the next chunk

        // If we've reached the end of the file, adjust the range request
        if (totalFileSize !== null && byteOffset >= totalFileSize) {
          console.log('Reached the end of the file.');
          break;
        }
      }
    } catch (error) {
      console.error('Error fetching or processing track data:', error);
    }
  }
}
