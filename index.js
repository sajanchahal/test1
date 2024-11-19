const express = require('express');
const axios = require('axios');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (if needed, such as your HTML page)
app.use(express.static('public'));

// API Key for PixelDrain
const PIXELDRAIN_API_KEY = '72f32e0e-6c19-4edd-a944-30da5f4eee6b';

// File upload function to PixelDrain
async function uploadToPixelDrain(remoteUrl, fileName) {
    const fileContent = await axios.get(remoteUrl, { responseType: 'arraybuffer' });
    
    const formData = new FormData();
    formData.append('file', fileContent.data, fileName);

    const response = await axios.post('https://pixeldrain.com/api/file', formData, {
        headers: {
            'Authorization': `Basic ${Buffer.from(':' + PIXELDRAIN_API_KEY).toString('base64')}`,
            ...formData.getHeaders(),
        },
    });
    return response.data;
}

// Endpoint for uploading file from URL
app.post('/upload', (req, res) => {
    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields) => {
        if (err) {
            return res.status(400).json({ error: 'Error parsing form data' });
        }

        const { url, fileName } = fields;
        if (!url || !fileName) {
            return res.status(400).json({ error: 'Invalid URL or file name' });
        }

        try {
            const result = await uploadToPixelDrain(url, fileName);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

// Serve HTML form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
