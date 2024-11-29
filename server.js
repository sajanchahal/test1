const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
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
            <title>Upload to PixelDrain</title>
        </head>
        <body>
            <h1>Upload File to PixelDrain</h1>
            <form method="POST" action="/upload" enctype="multipart/form-data">
                <label for="file">Choose a file:</label><br>
                <input type="file" id="file" name="file" required><br><br>
                <button type="submit">Upload</button>
            </form>
        </body>
        </html>
    `);
});

// Handle form submission and upload
app.post('/upload', async (req, res) => {
    const file = req.files?.file;
    if (!file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    try {
        // Prepare form data for file upload
        const form = new FormData();
        form.append('file', fs.createReadStream(file.tempFilePath), file.name);

        // Create Basic Authentication header
        const authHeader = 'Basic ' + Buffer.from(':' + pixelDrainApiKey).toString('base64');

        // Set up the headers for the request
        const headers = {
            'Authorization': authHeader,
            'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`,
            ...form.getHeaders()
        };

        // Upload the file to PixelDrain
        console.log('Uploading file to PixelDrain...');
        const uploadResponse = await axios.post('https://pixeldrain.com/api/file', form, {
            headers: headers,
        });

        console.log('File successfully uploaded:', uploadResponse.data);

        // Return the response as JSON
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
