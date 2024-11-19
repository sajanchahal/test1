const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve HTML form for uploading
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Upload Large File to PixelDrain</h1>
        <form method="POST" enctype="multipart/form-data">
          <label for="url">File URL:</label>
          <input type="url" name="url" required/><br><br>
          <label for="fileName">File Name:</label>
          <input type="text" name="fileName" required/><br><br>
          <label for="apiKey">API Key:</label>
          <input type="text" name="apiKey" value="72f32e0e-6c19-4edd-a944-30da5f4eee6b"/><br><br>
          <button type="submit">Upload</button>
        </form>
      </body>
    </html>
  `);
});

// POST route to handle the file upload
app.post('/', async (req, res) => {
  const { url, fileName, apiKey } = req.body;

  if (!url || !fileName || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await uploadToPixelDrain(apiKey, url, fileName);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Function to upload file from URL to PixelDrain
async function uploadToPixelDrain(apiKey, remoteUrl, fileName) {
  const url = 'https://pixeldrain.com/api/file';
  const form = new FormData();

  // Fetch the file from the URL
  const fileResponse = await axios.get(remoteUrl, { responseType: 'stream' });

  // Append the file to form data
  form.append('file', fileResponse.data, fileName);

  // Set up headers with authorization
  const headers = {
    ...form.getHeaders(),
    Authorization: `Basic ${Buffer.from(':' + apiKey).toString('base64')}`,
  };

  // Make the POST request to PixelDrain
  const uploadResponse = await axios.post(url, form, { headers });

  return uploadResponse.data;
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
