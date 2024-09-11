import { TrackProcessor, ProcessState } from './trackProcessor';
import SkeletonWriter from './skeletonWriter';
import * as fs from 'fs';

async function main() {

  const trkFileUrl = "https://dandiarchive.s3.amazonaws.com/blobs/d4a/c43/d4ac43bd-6896-4adf-a911-82edbea21f67";
  const headerChunkSize = 1000;
  // const trackToProcess = 108; // Track number to process

  const trackProcessor = new TrackProcessor();
  await trackProcessor.streamAndProcessHeader(trkFileUrl, 0, headerChunkSize - 1);

  if (!trackProcessor.globalHeader) {
    console.error('Error: Failed to fetch or process the TRK header.');
    return;
  }




  // Get the number of tracks from the global header
  const numTracks = trackProcessor.globalHeader.n_count;
  const tracksPerChunk = 7000;

  // Calculate the number of chunks
  const numFullChunks = Math.floor(numTracks / tracksPerChunk);
  const remainingTracks = numTracks % tracksPerChunk;

  // Start processing tract data immediately after the header
  let start = 1000;
  let trackNumber = 1;
  let byteOffset = start;

  const outputFilePath = 'trackData.txt';  // Specify the path where you want to save the track data

// Process full chunks of 7000 tracks
for (let chunkIndex = 0; chunkIndex < numFullChunks; chunkIndex++) {
  
  console.log(`\nProcessing chunk ${chunkIndex + 1} with ${tracksPerChunk} tracks`);

  const state: ProcessState = await trackProcessor.processTrackData(
    trkFileUrl, trackNumber, byteOffset, outputFilePath  // Pass the output file path
  );

  // Update byteOffset and trackNumber for the next chunk
  byteOffset = state.byteOffset;
  trackNumber = state.trackNumber;
}

// Process the remaining tracks (if any)
if (remainingTracks > 0) {
  console.log(`\nProcessing remaining chunk with ${remainingTracks} tracks\n`);

  await trackProcessor.processTrackData(trkFileUrl, trackNumber, byteOffset, outputFilePath);  // Pass the output file path
}












  // === Integrating SkeletonWriter ===
  // After processing the track data, you can use the SkeletonWriter to write the skeleton and metadata

  const skeletonWriter = new SkeletonWriter();  // Create an instance of SkeletonWriter

  // Generate the skeleton data
  const skeletonData = skeletonWriter.writeSkeleton(1);

  // Write the skeleton data to file
  const skeletonFilePath = './src/tract/1.bin';
  fs.writeFileSync(skeletonFilePath, skeletonData);

  // Write skeleton metadata (info)
  const paths = skeletonWriter.generateSkeletonFilePaths('./src/tract');
  skeletonWriter.writeSkeletonInfo(paths.infoPath);

  console.log(`Skeleton and info written to ${skeletonFilePath} and ${paths.infoPath}\n`);

}

main().catch(console.error);
