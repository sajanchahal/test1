const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve HTML form for upload
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Upload Large File to PixelDrain</title>
    </head>
    <body>
        <h1>Upload Large File to PixelDrain</h1>
        <form method="POST" action="/upload">
            <label for="url">File URL:</label>
            <input type="url" id="url" name="url" required><br><br>
            <label for="fileName">File Name:</label>
            <input type="text" id="fileName" name="fileName" required><br><br>
            <label for="apiKey">API Key:</label>
            <input type="text" id="apiKey" name="apiKey" required value="72f32e0e-6c19-4edd-a944-30da5f4eee6b"><br><br>
            <button type="submit">Upload</button>
        </form>
    </body>
    </html>
    `);
});

// Handle the upload functionality
app.post('/upload', async (req, res) => {
    const { url, fileName, apiKey } = req.body;

    if (!url || !fileName || !apiKey) {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    try {
        // Fetch the file content from the provided URL
        const fileContent = await fetchFileContent(url);
        if (!fileContent) {
            return res.status(500).json({ error: 'Failed to retrieve the file content from the provided URL.' });
        }

        // Upload the file to PixelDrain
        const uploadResult = await uploadToPixelDrain(apiKey, fileContent, fileName);
        return res.status(200).json(uploadResult);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Fetch the file content from the URL
async function fetchFileContent(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return response.data;
    } catch (error) {
        console.error('Error fetching file:', error);
        return null;
    }
}

// Upload file content to PixelDrain using the API
async function uploadToPixelDrain(apiKey, fileContent, fileName) {
    const url = 'https://pixeldrain.com/api/file';
    const form = new FormData();

    // Append the file content and the filename to the form data
    form.append('file', fileContent, { filename: fileName, contentType: 'application/octet-stream' });

    // Setup the headers for the request
    const headers = {
        ...form.getHeaders(),
        'Authorization': `Basic ${Buffer.from(':' + apiKey).toString('base64')}`,
    };

    try {
        // Send the POST request to PixelDrain
        const response = await axios.post(url, form, { headers });
        return response.data;
    } catch (error) {
        console.error('Error uploading to PixelDrain:', error);
        throw new Error('Failed to upload to PixelDrain');
    }
}

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
