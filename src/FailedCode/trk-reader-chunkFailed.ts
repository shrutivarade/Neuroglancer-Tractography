import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Function to fetch and process the data in chunks
async function fetchAndProcessChunks(url: string, start: number, totalTracks: number, numChunks: number) {
  const outputFilePath = path.join(__dirname, 'track_data_output.txt');
  const writeStream = fs.createWriteStream(outputFilePath);

  const tracksPerChunk = Math.ceil(totalTracks / numChunks);
  const bytesPerTrack = 4 + (12 * 698); // 4 bytes for number of points + estimated 698 points * 12 bytes

  // Track the total bytes read
  let totalBytesRead = 0;

  for (let i = 0; i < numChunks; i++) {
    const chunkStartByte = start + i * bytesPerTrack * tracksPerChunk;
    const chunkEndByte = chunkStartByte + bytesPerTrack * tracksPerChunk - 1;

    // Measure time taken for GET request for each chunk
    const requestStartTime = new Date().getTime();

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Range': `bytes=${chunkStartByte}-${chunkEndByte}`
      }
    });

    const requestEndTime = new Date().getTime();
    const requestTimeTaken = (requestEndTime - requestStartTime) / 1000;
    console.log(`\nTime taken for GET request (Chunk ${i + 1}): ${requestTimeTaken} seconds`);

    const buffer = Buffer.from(response.data);
    totalBytesRead += response.data.byteLength;

    // Record the start time for processing
    const processStartTime = new Date().getTime();

    // Process the track data in this chunk
    readTrackDataAndWrite(buffer, 0, writeStream);

    // Record the end time for processing
    const processEndTime = new Date().getTime();
    const processTimeTaken = (processEndTime - processStartTime) / 1000;

    console.log(`\nTime taken to process Chunk ${i + 1}: ${processTimeTaken} seconds`);
  }

  console.log(`\nTotal bytes read: ${totalBytesRead} bytes`);
  console.log(`\nTrack data written to: ${outputFilePath}`);

  // Close the write stream
  writeStream.end();
}

// Function to read the track data from the buffer and write the output to a text file
function readTrackDataAndWrite(buffer: Buffer, offset: number, writeStream: fs.WriteStream) {
  let trackNumber = 1;

  while (offset < buffer.length) {
    // Read the number of points in the track (4 bytes)
    const n_points = buffer.readInt32LE(offset);
    offset += 4;

    if (n_points <= 0) {
      writeStream.write('Error: Invalid number of points in the track.\n');
      return;
    }

    // Write the track number and the number of points to the file
    writeStream.write(`Track ${trackNumber} processed, number of points: ${n_points}\n`);

    // Skip the bytes for the points' coordinates (each point has 12 bytes)
    const bytesForTrack = n_points * 12;
    offset += bytesForTrack;

    trackNumber++;
  }
}

async function main() {
  const trkFileUrl = "https://dandiarchive.s3.amazonaws.com/blobs/d4a/c43/d4ac43bd-6896-4adf-a911-82edbea21f67";
  
  const headerChunkSize = 1000;  // First 1000 bytes are the header
  const totalTracks = 69832;     // Total number of tracks
  const numChunks = 10;         // Number of chunks to divide the tracks into

  // Stream and process the track data in chunks
  await fetchAndProcessChunks(trkFileUrl, headerChunkSize, totalTracks, numChunks);
}

// Execute the main function
main().catch(console.error);
