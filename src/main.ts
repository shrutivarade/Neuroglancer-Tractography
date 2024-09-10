import { TrackProcessor, ProcessState } from './trackProcessor';

async function main() {
  const trkFileUrl = "https://dandiarchive.s3.amazonaws.com/blobs/d4a/c43/d4ac43bd-6896-4adf-a911-82edbea21f67";
  const headerChunkSize = 1000;
  const trackToProcess = 108; // Track number to process

  const trackProcessor = new TrackProcessor(); // Global header will be set after header processing
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

  let start = 1000; // Start immediately after the header
  let trackNumber = 1;
  let byteOffset = start;

  // Process full chunks of 7000 tracks
  for (let chunkIndex = 0; chunkIndex < numFullChunks; chunkIndex++) {
    const chunkSize = tracksPerChunk * 12 * 4; // 12 bytes per point (x, y, z), 4 bytes for the number of points in the track
    console.log(`Processing chunk ${chunkIndex + 1} with ${tracksPerChunk} tracks`);

    // Call processTrackData and get the state back
    const state: ProcessState = await trackProcessor.processTrackData(
      trkFileUrl, byteOffset, chunkSize, trackToProcess, trackNumber
    );

    // Update byteOffset and trackNumber for the next chunk
    byteOffset = state.byteOffset;
    trackNumber = state.trackNumber;
  }

  // Process the remaining tracks (if any)
  if (remainingTracks > 0) {
    const chunkSize = remainingTracks * 12 * 4;
    console.log(`Processing remaining chunk with ${remainingTracks} tracks`);

    await trackProcessor.processTrackData(trkFileUrl, byteOffset, chunkSize, trackToProcess, trackNumber);
  }
}

main().catch(console.error);
