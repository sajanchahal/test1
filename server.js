const axios = require('axios');

async function uploadGoogleDriveToPixelDrain(driveFileId) {
    try {
        const driveAPIKey = 'AIzaSyBl_IIgoc6zc0Qobciwm7RM9N8KXe_lt0k';
        const pixelDrainApiKey = '72f32e0e-6c19-4edd-a944-30da5f4eee6b';

        // Step 1: Get Google Drive file metadata
        const fileMetadata = await axios.get(
            `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=name,mimeType,size`,
            { headers: { Authorization: `Bearer ${driveAPIKey}` } }
        );
        const { name, mimeType } = fileMetadata.data;

        console.log(`File Info - Name: ${name}, MIME Type: ${mimeType}`);

        // Step 2: Stream file content from Google Drive
        const fileStream = await axios({
            method: 'GET',
            url: `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
            headers: { Authorization: `Bearer ${driveAPIKey}` },
            responseType: 'stream',
        });

        // Step 3: Upload to PixelDrain
        const uploadResponse = await axios({
            method: 'POST',
            url: `https://pixeldrain.com/api/file`,
            headers: {
                Authorization: `Bearer ${pixelDrainApiKey}`,
                'Content-Type': mimeType,
            },
            data: fileStream.data,
        });

        console.log('PixelDrain Upload Response:', uploadResponse.data);

        return uploadResponse.data;
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Example usage: Replace with your Google Drive file ID
uploadGoogleDriveToPixelDrain('1q4E2Z14dwOhUsKdrfvEP5chZ0TNOP15l');
