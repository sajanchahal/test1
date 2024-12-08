const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const FTPClient = require("ftp");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// FTP credentials
const ftpConfig = {
    host: "ftp.serverbyt.in",
    user: "new@dramadekho.xyz",
    password: "jg7hx8qi6t",
};

// Serve HTML and JavaScript
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FTP Upload with Progress</title>
        </head>
        <body>
            <h1>Upload File to FTP</h1>
            <form id="uploadForm" method="POST" action="/upload">
                <label for="url">File URL:</label>
                <input type="text" id="url" name="url" required>
                <br>
                <label for="path">FTP Path:</label>
                <input type="text" id="path" name="path" value="/" required>
                <br>
                <label for="filename">File Name:</label>
                <input type="text" id="filename" name="filename" required>
                <br>
                <button type="submit">Upload</button>
            </form>

            <h2 id="status">Status: Waiting...</h2>
            <pre id="progress"></pre>

            <script>
                const form = document.getElementById("uploadForm");
                const status = document.getElementById("status");
                const progress = document.getElementById("progress");

                form.addEventListener("submit", (e) => {
                    e.preventDefault();
                    status.textContent = "Status: Uploading...";
                    progress.textContent = "";

                    const formData = new FormData(form);
                    const urlParams = new URLSearchParams(formData);

                    const eventSource = new EventSource(\`/upload?${urlParams.toString()}\`);

                    eventSource.onmessage = (event) => {
                        progress.textContent += event.data + "\\n";
                        if (event.data.includes("File successfully uploaded to FTP!")) {
                            status.textContent = "Status: Completed!";
                            eventSource.close();
                        } else if (event.data.includes("Error")) {
                            status.textContent = "Status: Error occurred!";
                            eventSource.close();
                        }
                    };

                    eventSource.onerror = () => {
                        status.textContent = "Status: Connection lost!";
                        eventSource.close();
                    };
                });
            </script>
        </body>
        </html>
    `);
});

// Handle file upload and progress
app.get("/upload", async (req, res) => {
    const { url, path, filename } = req.query;
    const destination = `${path}/${filename}`; // Combine path and filename

    let totalSize = 0;
    let uploadedSize = 0;

    // Start SSE connection
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.flushHeaders();

    try {
        // Get file size
        const headResponse = await axios.head(url);
        totalSize = parseInt(headResponse.headers["content-length"], 10);

        if (isNaN(totalSize)) {
            res.write(`data: Unable to determine file size.\n\n`);
            res.end();
            return;
        }

        res.write(`data: Starting upload for ${filename} (${totalSize} bytes).\n\n`);

        // Set up FTP client
        const client = new FTPClient();
        client.on("ready", async () => {
            try {
                // Stream the file from the URL
                const response = await axios({
                    url,
                    method: "GET",
                    responseType: "stream",
                });

                response.data.on("data", (chunk) => {
                    uploadedSize += chunk.length; // Update uploaded size
                    const percent = ((uploadedSize / totalSize) * 100).toFixed(2);
                    res.write(`data: Progress: ${percent}% (${uploadedSize}/${totalSize} bytes)\n\n`);
                });

                client.put(response.data, destination, (err) => {
                    if (err) {
                        res.write(`data: Error: Failed to upload file to FTP.\n\n`);
                    } else {
                        res.write(`data: File successfully uploaded to FTP!\n\n`);
                    }
                    res.end();
                    client.end();
                });
            } catch (downloadErr) {
                res.write(`data: Error: ${downloadErr.message}\n\n`);
                res.end();
                client.end();
            }
        });

        client.on("error", (err) => {
            res.write(`data: FTP connection error: ${err.message}\n\n`);
            res.end();
        });

        client.connect(ftpConfig);
    } catch (err) {
        res.write(`data: Error: ${err.message}\n\n`);
        res.end();
    }
});

// Start the server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
