const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(express.urlencoded({ extended: true }));

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

app.post('/', async (req, res) => {
  const { url, apiKey } = req.body;

  if (!url || !apiKey) {
    return res.status(400).send('URL and API Key are required.');
  }

  try {
    // Initialize FormData
    const form = new FormData();

    // Append file as a stream from the provided URL
    const fileStream = await axios.get(url, { responseType: 'stream' });
    form.append('file', fileStream.data);

    // Set headers for HTTP Basic Authentication
    const headers = {
      ...form.getHeaders(),
      Authorization: `Basic ${Buffer.from(`:${apiKey}`).toString('base64')}`,
    };

    // Stream directly to PixelDrain
    const response = await axios.post('https://pixeldrain.com/api/file', form, { headers });

    res.send(`
      <h1>Upload Successful!</h1>
      <p>Response:</p>
      <pre>${JSON.stringify(response.data, null, 2)}</pre>
      <a href="/">Upload another file</a>
    `);
  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
    res.status(500).send('Upload failed: ' + (error.response?.data?.error || error.message));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
