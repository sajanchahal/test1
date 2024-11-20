const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const app = express();

// Middleware to parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Serve the HTML form
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

// Handle the POST request to upload file
app.post('/', async (req, res) => {
  const { url, apiKey } = req.body;

  if (!url || !apiKey) {
    return res.status(400).send('URL and API Key are required.');
  }

  try {
    // Fetch the file content from the provided URL
    const fileStream = await axios.get(url, { responseType: 'stream' });

    // Create a FormData object and append the file stream
    const form = new FormData();
    form.append('file', fileStream.data);

    // Set headers, including the Authorization header
    const headers = {
      ...form.getHeaders(),
      Authorization: `Bearer ${apiKey}`, // Add Bearer token
    };

    // Send the request to PixelDrain
    const response = await axios.post('https://pixeldrain.com/api/file', form, {
      headers,
    });

    // Handle success
    const responseData = response.data;
    res.send(`
      <h1>Upload Successful!</h1>
      <p>Here is the response:</p>
      <pre>${JSON.stringify(responseData, null, 2)}</pre>
      <a href="/">Upload another file</a>
    `);
  } catch (error) {
    // Handle errors
    console.error('Error:', error.response?.data || error.message);
    res.status(500).send('Upload failed: ' + (error.response?.data?.error || error.message));
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
