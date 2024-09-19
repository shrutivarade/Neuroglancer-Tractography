import { TrackProcessor } from './trackProcessor';
import { SkeletonWriter } from "./skeletonWriter";

import path from 'path';

import dotenv from 'dotenv';
dotenv.config();

async function main() {

  const trackProcessor = new TrackProcessor();

  const trkFileUrl = 'https://dandiarchive.s3.amazonaws.com/blobs/d4a/c43/d4ac43bd-6896-4adf-a911-82edbea21f67';
  await trackProcessor.streamAndProcessHeader(trkFileUrl, 0, 999); // Only header
  if (!trackProcessor.globalHeader) {
    console.error('Error: Failed to fetch or process the TRK header.');
    return;
  }


  const totalTracks = trackProcessor.globalHeader.n_count;
  const randomTrackNumbers = trackProcessor.getRandomTrackIndices(totalTracks, 200);
  // const randomTrackNumbers = [1];

  /* Process all the tracks from starting from 1 and generate precomuted file for all
   the tracks present in the randomTrackNumbers array. */

  // for local usage
  const trkFilePath = '/Users/shrutiv/MyDocuments/GitHub/d4ac43bd-6896-4adf-a911-82edbea21f67.trk';

  // await trackProcessor.processTrackData(randomTrackNumbers, 1, trkFileUrl);
  // const { timestamp } = await trackProcessor.processTrackData(randomTrackNumbers, 1, trkFileUrl);
  const { timestamp } = await trackProcessor.processTrackData(randomTrackNumbers, 1, trkFilePath);

  // Now, get the output directory
  const outputDirectory = path.resolve(__dirname, '..', 'src');

  await SkeletonWriter.uploadSkeletonFilePathsToS3(outputDirectory, timestamp);

}

main().catch(console.error);
