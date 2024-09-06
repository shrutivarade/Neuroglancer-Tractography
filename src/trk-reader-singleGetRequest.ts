import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Function to stream and process the entire track data
async function streamAndProcessTrackData(url: string, start: number) {
  try {
    // Measure time taken for the GET request
    const requestStartTime = new Date().getTime();

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Range': `bytes=${start}-`
      }
    });

    const requestEndTime = new Date().getTime();
    const requestTimeTaken = (requestEndTime - requestStartTime) / 1000; // Convert to seconds
    console.log(`\nTime taken for GET request: ${requestTimeTaken} seconds`);

    const buffer = Buffer.from(response.data);
    console.log(`\nReceived ${response.data.byteLength} bytes starting from byte ${start}`);

    // Write this data to a file
    const outputFilePath = path.join(__dirname, 'track_singleGetRequest.txt');
    const writeStream = fs.createWriteStream(outputFilePath);

    // Record the start time for processing
    const processStartTime = new Date().getTime();

    // Process the track data and write to file
    readTrackDataAndWrite(buffer, 0, writeStream);

    // Record the end time and calculate time taken for processing
    const processEndTime = new Date().getTime();
    const processTimeTaken = (processEndTime - processStartTime) / 1000; // Convert to seconds

    console.log(`\nTime taken to process the entire dataset: ${processTimeTaken} seconds`);
    console.log(`\nTrack data written to: ${outputFilePath}`);

    // Close the write stream
    writeStream.end();

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error streaming or processing the TRK file:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Function to read the entire track data and write the output to a text file
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

  // Stream and process the entire track data
  await streamAndProcessTrackData(trkFileUrl, headerChunkSize);
}

// Execute the main function
main().catch(console.error);
