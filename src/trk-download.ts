import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Function to download the TRK file
async function downloadTrkFile(url: string, outputPath: string): Promise<void> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        maxContentLength: Infinity, // Set this to prevent size restrictions
        maxBodyLength: Infinity,    // Set this to prevent size restrictions
      });
  
      fs.writeFileSync(outputPath, Buffer.from(response.data), 'binary');
      console.log('TRK file downloaded successfully to', outputPath);
    } catch (error) {
      // Assert that error is of type 'Error'
      if (error instanceof Error) {
        console.error('Error downloading the TRK file:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  }


// Main function to handle the download
async function main() {
  const trkFileUrl = "https://dandiarchive.s3.amazonaws.com/blobs/d4a/c43/d4ac43bd-6896-4adf-a911-82edbea21f67";
  
  const trkFilePath = path.join(__dirname, 'downloaded_file.trk');

  // Download the TRK file
  await downloadTrkFile(trkFileUrl, trkFilePath);

  // Check if the file exists and log its size
  if (fs.existsSync(trkFilePath)) {
    const stats = fs.statSync(trkFilePath);
    console.log(`Downloaded file size: ${stats.size} bytes`);
  } else {
    console.error('File download failed.');
  }
}

// Execute the main function
main().catch(console.error);
