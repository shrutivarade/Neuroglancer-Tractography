import { TrackProcessor } from './trackProcessor';

async function main() {

  //Load the data
  const trkFileUrl = "https://dandiarchive.s3.amazonaws.com/blobs/d4a/c43/d4ac43bd-6896-4adf-a911-82edbea21f67";
  
  //Variable Declaration
  const headerChunkSize = 1000;
  const chunkSize = 10 * 1024 * 1024; // 10MB chunks
  const trackToProcess = 108; // Track number to process

  //Creating trackProcessing Object
  const trackProcessor = new TrackProcessor(); 
  await trackProcessor.streamAndProcessHeader(trkFileUrl, 0, headerChunkSize - 1);

  if (!trackProcessor.globalHeader) {
    console.error('Error: Failed to fetch or process the TRK header.');
    return;
  }

  // Step 1: Process track data and write track info, process track 108
  await trackProcessor.processTrackData(trkFileUrl, headerChunkSize, chunkSize, trackToProcess);
}

main().catch(console.error);
