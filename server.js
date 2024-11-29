const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const FormData = require('form-data');
const Buffer = require('buffer').Buffer;

const app = express();
const pixelDrainApiKey = '72f32e0e-6c19-4edd-a944-30da5f4eee6b'; // Replace with your PixelDrain API key

app.use(bodyParser.urlencoded({ extended: true }));

// Serve the HTML form
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Upload Remote File to PixelDrain</title>
        </head>
        <body>
            <h1>Upload Remote File to PixelDrain</h1>
            <form method="POST" action="/upload">
                <label for="url">Enter Remote File URL:</label><br>
                <input type="url" id="url" name="url" required placeholder="https://example.com/file" style="width: 100%;"><br><br>
                <button type="submit">Upload</button>
            </form>
        </body>
        </html>
    `);
});

// Handle form submission and upload
app.post('/upload', async (req, res) => {
    const remoteUrl = req.body.url;
    if (!remoteUrl) {
        return res.status(400).json({ error: 'No URL provided' });
    }

    try {
        // Step 1: Fetch the file from the remote URL
        const fileStream = await axios({
            method: 'GET',
            url: remoteUrl,
            responseType: 'stream',
        });

        // Step 2: Create Basic Authentication header
        const authHeader = 'Basic ' + Buffer.from(':' + pixelDrainApiKey).toString('base64');

        // Step 3: Prepare FormData for file upload
        const form = new FormData();
        form.append('file', fileStream.data, { filename: 'uploaded_file' });

        // Step 4: Set up headers for the upload request
        const headers = {
            'Authorization': authHeader,
            'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`,
            ...form.getHeaders()
        };

        // Step 5: Upload the file to PixelDrain
        console.log('Uploading file to PixelDrain...');
        const uploadResponse = await axios.post('https://pixeldrain.com/api/file', form, {
            headers: headers,
        });

        // Step 6: Return the direct download link from the response
        console.log('File successfully uploaded:', uploadResponse.data);

        // Return the JSON response containing the direct download link
        res.json({
            message: 'File successfully uploaded to PixelDrain',
            download_link: uploadResponse.data, // PixelDrain URL
        });

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);

        // Return the error as JSON
        res.status(500).json({
            error: error.response?.data || error.message,
        });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
