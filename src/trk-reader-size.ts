import axios from 'axios';

async function main() {
    const trkFileUrl = "https://dandiarchive.s3.amazonaws.com/blobs/d4a/c43/d4ac43bd-6896-4adf-a911-82edbea21f67";

    try {
        // Use a HEAD request to get the total size of the file in bytes
        const response = await axios.head(trkFileUrl);

        // Extract the content length from the response headers
        const totalSizeBytes = parseInt(response.headers['content-length'], 10);

        if (isNaN(totalSizeBytes)) {
            console.error("Failed to retrieve the content length.");
            return;
        }

        // Convert to different units
        const sizeInMB = totalSizeBytes / (1024 * 1024);
        const sizeInGB = totalSizeBytes / (1024 * 1024 * 1024);
        const sizeInTB = totalSizeBytes / (1024 * 1024 * 1024 * 1024);

        // Log the size in various units
        console.log(`Total size of the data:`);
        console.log(`Bytes: ${totalSizeBytes} bytes`);
        console.log(`MB: ${sizeInMB.toFixed(2)} MB`);
        console.log(`GB: ${sizeInGB.toFixed(2)} GB`);
        console.log(`TB: ${sizeInTB.toFixed(2)} TB`);

    } catch (error) {

        if (error instanceof Error) {
            console.error('Error fetching the TRK file size:', error.message);
        } else {
            console.error('Unexpected error:', error);
        }
        
    }
}

// Execute the main function
main().catch(console.error);
