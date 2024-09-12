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

  // Modify processTrackData to return the state (ProcessState) for the next chunk
  async processTrackData(
    url: string,
    byteOffset: number,
    chunkSize: number,
    trackToProcess: number,
    trackNumber: number
  ): Promise<ProcessState> {
    if (!this.globalHeader) {
      console.error('Error: Global header is not initialized.');
      return { byteOffset, trackNumber, offset: 0 };
    }

    const outputFilePath = path.join(__dirname, 'track_data.txt');
    const writeStream = fs.createWriteStream(outputFilePath, { flags: 'a' });

    let offset = 0;
    let track108Processed = false;

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'Range': `bytes=${byteOffset}-${byteOffset + chunkSize - 1}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const buffer = Buffer.from(response.data);
      if (buffer.length === 0) {
        console.log('No more data to read.');
        return { byteOffset, trackNumber, offset: 0 };
      }

      const vertices: Vertex[] = [];
      const edges: Edge[] = [];
      let vertexIndex = 0;

      while (offset < buffer.length) {
        // Read the number of points for the current track
        const n_points = buffer.readInt32LE(offset);
        const bytesForTrack = n_points * 12 + 4; // 4 bytes for the number of points, 12 bytes per point

        // Check if adding this track will exceed the chunk size
        if (offset + bytesForTrack > chunkSize) {
          // console.log(`Track ${trackNumber} exceeds chunk size, moving to next chunk.`);

          // Update byteOffset for the next chunk and break
          byteOffset += buffer.byteLength;
          return { byteOffset, trackNumber, offset: 0 }; // Return the state and break
        }

        offset += 4; // Move the offset after reading the number of points

        // Log track data
        // writeStream.write(`Track ${trackNumber} processed, number of points: ${n_points}\n`);

        // Process track 108 if needed
        if (trackNumber === trackToProcess && !track108Processed) {
          console.log(`\nProcessing track ${trackToProcess} with ${n_points} points.`);

          for (let i = 0; i < n_points; i++) {
            const x = buffer.readFloatLE(offset);
            const y = buffer.readFloatLE(offset + 4);
            const z = buffer.readFloatLE(offset + 8);
            offset += 12;

            const voxelPoint: [number, number, number] = [x, y, z];
            const rasPoint = VoxelToRASConverter.voxelToRAS(voxelPoint, this.globalHeader.vox_to_ras);

            // Log the conversion result
            console.log(`Voxel: [${x}, ${y}, ${z}] -> RAS: [${rasPoint[0]}, ${rasPoint[1]}, ${rasPoint[2]}]`);
            writeStream.write(`\nVoxel: [${x}, ${y}, ${z}] -> RAS: [${rasPoint[0]}, ${rasPoint[1]}, ${rasPoint[2]}]`);



            // Add vertex data
            vertices.push({ x: rasPoint[0], y: rasPoint[1], z: rasPoint[2] });

            // Add edge data
            if (i > 0) {
              edges.push({ vertex1: vertexIndex - 1, vertex2: vertexIndex });
            }
            vertexIndex++;
          }

          const outputDirectory =  path.resolve(__dirname, '..', 'src'); // You can change this to any directory

          // Generate paths for skeleton files
          const { binaryFilePath, propInfoFilePath, skeletonInfoFilePath } = SkeletonWriter.generateSkeletonFilePaths(outputDirectory);

          // Write the skeleton binary data
          SkeletonWriter.writeSkeleton(vertices, edges, binaryFilePath);

          // Write the propInfo to the propInfoPath
          SkeletonWriter.writePropInfo(propInfoFilePath);
          // Write the skeleton metadata to the infoFilePath
          SkeletonWriter.writeSkeletonInfo(skeletonInfoFilePath);

          

          console.log(`Track ${trackToProcess} skeleton and info files written.`);

          track108Processed = true; // Mark as processed

        } else {
          offset += n_points * 12; // Skip the remaining track data
        }

        trackNumber++;
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
