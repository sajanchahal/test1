const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const pixelDrainApiKey = '72f32e0e-6c19-4edd-a944-30da5f4eee6b'; // Replace with your API key

app.use(bodyParser.urlencoded({ extended: true }));

// Serve the HTML form
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Upload to PixelDrain</title>
        </head>
        <body>
            <h1>Upload File to PixelDrain</h1>
            <form method="POST" action="/upload">
                <label for="url">Enter Direct Download URL:</label><br>
                <input type="url" id="url" name="url" required placeholder="https://example.com/file" style="width: 100%;"><br><br>
                <button type="submit">Upload</button>
            </form>
        </body>
        </html>
    `);
});

// Handle form submission and upload
app.post('/upload', async (req, res) => {
    const downloadUrl = req.body.url;

    try {
        console.log('Fetching file from:', downloadUrl);

        // Step 1: Stream file from the provided URL
        const fileStream = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
        });

        // Step 2: Upload the streamed file to PixelDrain
        console.log('Uploading file to PixelDrain...');
        const uploadResponse = await axios({
            method: 'POST',
            url: 'https://pixeldrain.com/api/file',
            headers: {
                Authorization: `Bearer ${pixelDrainApiKey}`,
                'Content-Type': 'application/octet-stream',
            },
            data: fileStream.data,
        });

        console.log('File successfully uploaded:', uploadResponse.data);

        // Return the JSON response
        res.json(uploadResponse.data);
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
