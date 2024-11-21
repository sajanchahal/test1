const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const app = express();
const port = 3000;

// API keys
const pixelDrainApiKey = '72f32e0e-6c19-4edd-a944-30da5f4eee6b';
const googleApiKey = 'AIzaSyBl_IIgoc6zc0Qobciwm7RM9N8KXe_lt0k';

// Middleware to parse incoming JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer setup for local file upload
const upload = multer({ dest: 'uploads/' });

// Handle form submission for different file sources
app.post('/upload', upload.single('localFile'), async (req, res) => {
    const { sourceType, fileName, url, driveLink } = req.body;

    try {
        let uploadResult;
        if (sourceType === 'direct') {
            if (!url || !fileName) {
                return res.status(400).json({ error: 'Invalid direct link upload request.' });
            }
            uploadResult = await uploadFromUrl(url, fileName);
        } else if (sourceType === 'googleDrive') {
            if (!driveLink) {
                return res.status(400).json({ error: 'Google Drive link not provided.' });
            }
            const fileId = extractDriveFileId(driveLink);
            uploadResult = await uploadFromGoogleDrive(fileId);
        } else if (sourceType === 'deviceUpload') {
            if (!req.file || req.file.mimetype === 'application/octet-stream') {
                return res.status(400).json({ error: 'File upload error or file not provided.' });
            }
            const filePath = req.file.path;
            const fileName = req.file.originalname;
            uploadResult = await uploadFromDevice(filePath, fileName);
        } else {
            return res.status(400).json({ error: 'Invalid source type.' });
        }

        // Send the file URL after successful upload
        res.json({ message: 'File uploaded successfully', downloadUrl: uploadResult });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Function to upload file from a direct URL
async function uploadFromUrl(url, fileName) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const fileContent = response.data;
    return uploadToPixelDrain(fileContent, fileName);
}

// Function to upload file from Google Drive
async function uploadFromGoogleDrive(fileId) {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${googleApiKey}`;
    const metadataUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name&key=${googleApiKey}`;

    // Fetch file content
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const fileContent = response.data;

    // Fetch file metadata for file name
    const metadataResponse = await axios.get(metadataUrl);
    const fileName = metadataResponse.data.name;

    return uploadToPixelDrain(fileContent, fileName);
}

// Function to upload file from the local device
async function uploadFromDevice(filePath, fileName) {
    const fileContent = fs.readFileSync(filePath);
    return uploadToPixelDrain(fileContent, fileName);
}

// Function to upload file to PixelDrain
async function uploadToPixelDrain(fileContent, fileName) {
    const form = new FormData();
    form.append('file', fileContent, fileName);

    const headers = {
        ...form.getHeaders(),
        'Authorization': `Basic ${Buffer.from(':' + pixelDrainApiKey).toString('base64')}`,
    };

    const response = await axios.post('https://pixeldrain.com/api/file', form, { headers });
    if (response.data.id) {
        return `https://download.directserver.workers.dev/${response.data.id}/${fileName}`;
    } else {
        throw new Error('Failed to upload to PixelDrain.');
    }
}

// Helper function to extract Google Drive file ID from URL
function extractDriveFileId(url) {
    const regex = /[-\w]{25,}/;
    const matches = url.match(regex);
    return matches ? matches[0] : null;
}

// HTML form to allow user to select upload method
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Upload Large File</title>
        </head>
        <body>
            <h1>Upload Large File</h1>
            <form method="post" enctype="multipart/form-data" action="/upload">
                <label>Upload Type:</label><br>
                <input type="radio" id="direct" name="sourceType" value="direct" checked onclick="toggleFields()"> Direct Link<br>
                <input type="radio" id="googleDrive" name="sourceType" value="googleDrive" onclick="toggleFields()"> Google Drive Link<br>
                <input type="radio" id="deviceUpload" name="sourceType" value="deviceUpload" onclick="toggleFields()"> Upload from Device<br><br>

                <div id="directFields">
                    <label for="url">File URL:</label>
                    <input type="url" id="url" name="url"><br><br>
                    <label for="fileName">File Name:</label>
                    <input type="text" id="fileName" name="fileName"><br><br>
                </div>

                <div id="googleDriveFields" style="display:none;">
                    <label for="driveLink">Google Drive Link:</label>
                    <input type="url" id="driveLink" name="driveLink"><br><br>
                </div>

                <div id="deviceUploadFields" style="display:none;">
                    <label for="localFile">Upload File:</label>
                    <input type="file" id="localFile" name="localFile"><br><br>
                </div>

                <button type="submit">Upload</button>
            </form>
            <script>
                function toggleFields() {
                    document.getElementById('directFields').style.display = document.getElementById('direct').checked ? 'block' : 'none';
                    document.getElementById('googleDriveFields').style.display = document.getElementById('googleDrive').checked ? 'block' : 'none';
                    document.getElementById('deviceUploadFields').style.display = document.getElementById('deviceUpload').checked ? 'block' : 'none';
                }
            </script>
        </body>
        </html>
    `);
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
