const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const app = express();
const port = 3000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve the HTML form at the root
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Upload File to PixelDrain</title>
    </head>
    <body>
      <h1>Upload File to PixelDrain</h1>
      <form method="POST" action="/">
        <label for="url">File URL:</label>
        <input type="url" id="url" name="url" required><br><br>
        <label for="apiKey">API Key:</label>
        <input type="text" id="apiKey" name="apiKey" required value="72f32e0e-6c19-4edd-a944-30da5f4eee6b"><br><br>
        <button type="submit">Upload</button>
      </form>
    </body>
    </html>
  `);
});

// Handle file upload from URL
app.post('/', async (req, res) => {
  const { url, apiKey } = req.body;

  if (!url || !apiKey) {
    return res.status(400).send('URL and API Key are required.');
  }

  try {
    // Fetch the file content from the URL as a stream
    const fileStream = await axios.get(url, { responseType: 'stream' });

    // Create FormData and append the stream to it under the 'file' field
    const form = new FormData();
    form.append('file', fileStream.data);

    // Prepare headers for the PixelDrain upload
    const headers = {
      ...form.getHeaders(),  // Add FormData headers
      Authorization: `Bearer ${apiKey}`,
    };

    // Send the FormData with the file stream as the 'file' field
    const uploadResponse = await axios.post(
      'https://pixeldrain.com/api/file',  // PixelDrain API endpoint
      form,                               // The form with the file stream
      { headers }
    );

    // Handle the successful upload response
    res.send(`
      <h1>Upload successful!</h1>
      <p>File uploaded successfully to PixelDrain. Here is the response:</p>
      <pre>${JSON.stringify(uploadResponse.data, null, 2)}</pre>
      <a href="/">Upload another file</a>
    `);
  } catch (error) {
    console.error('Error during upload:', error.response?.data || error.message);
    res.status(500).send('Upload failed: ' + (error.response?.data?.error || error.message));
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
