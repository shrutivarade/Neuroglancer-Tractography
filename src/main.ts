import { TrackProcessor, ProcessState } from './trackProcessor';

async function main() {
  // const trkFileUrl = 'https://dandiarchive.s3.amazonaws.com/blobs/d4a/c43/d4ac43bd-6896-4adf-a911-82edbea21f67';
  const trkFileUrl = 's3://linc-brain-mit-prod-us-east-2/blobs/3b0/8ce/3b08ce53-696a-4ce8-8b8f-e8cde24ef942';

  // *****************************Header****************************
  const headerChunkSize = 1000;
  const trackProcessor = new TrackProcessor(); 
  await trackProcessor.streamAndProcessHeader(trkFileUrl, 0, headerChunkSize - 1);

  if (!trackProcessor.globalHeader) {
    console.error('Error: Failed to fetch or process the TRK header.');
    return;
  }

  // *****************************tracks****************************
  // Get the number of tracks from the global header
  const numTracks = trackProcessor.globalHeader.n_count;
  const tracksPerChunk = 7000;

  // Calculate the number of chunks
  const numFullChunks = Math.floor(numTracks / tracksPerChunk);
  const remainingTracks = numTracks % tracksPerChunk;

  let trackNumber = 1; // Start processing from the first track
  let byteOffset = 1000; // Offset to start reading track data

  // Process full chunks of 7000 tracks
  for (let chunkIndex = 0; chunkIndex < numFullChunks; chunkIndex++) {
    const chunkSize = tracksPerChunk * 12 * 4; // 12 bytes per point (x, y, z), 4 bytes for the number of points in the track
    console.log(`\nProcessing chunk ${chunkIndex + 1} with ${tracksPerChunk} tracks`);

    // Call processTrackData to process the first 100 tracks
    const state: ProcessState = await trackProcessor.processTrackData(
      trkFileUrl, byteOffset, chunkSize, trackNumber
    );

    // Update byteOffset and trackNumber for the next chunk
    byteOffset = state.byteOffset;
    trackNumber = state.trackNumber;

    if (trackNumber > 100) {
      break; // Stop after processing the first 100 tracks
    }
  }

  // Process the remaining tracks (if necessary, though not required in this case)
  if (remainingTracks > 0 && trackNumber <= 100) {
    const chunkSize = remainingTracks * 12 * 4;
    console.log(`\nProcessing remaining chunk with ${remainingTracks} tracks\n`);

    await trackProcessor.processTrackData(trkFileUrl, byteOffset, chunkSize, trackNumber);
  }
}

main().catch(console.error);
