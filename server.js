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

// Serve HTML form
app.get("/", (req, res) => {
    res.send(`
        <form method="POST" action="/upload">
            <label for="url">File URL:</label>
            <input type="text" id="url" name="url" required>
            <br>
            <label for="path">FTP Path (e.g., /):</label>
            <input type="text" id="path" name="path" value="/" required>
            <br>
            <label for="filename">File Name:</label>
            <input type="text" id="filename" name="filename" required>
            <br>
            <button type="submit">Upload</button>
        </form>
        <hr>
        <div id="status">Waiting for upload...</div>
        <script>
            const eventSource = new EventSource('/status');
            eventSource.onmessage = (event) => {
                document.getElementById('status').innerText = event.data;
            };
        </script>
    `);
});

// Live status updates
let statusMessage = "Waiting for upload...";

app.get("/status", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendStatus = () => {
        res.write(`data: ${statusMessage}\n\n`);
    };

    sendStatus();

    // Interval to keep connection alive
    const interval = setInterval(sendStatus, 1000);

    req.on("close", () => {
        clearInterval(interval);
    });
});

// Handle file upload
app.post("/upload", async (req, res) => {
    const { url, path, filename } = req.body;
    const destination = `${path}/${filename}`; // Combine path and filename

    try {
        // Get file size
        const headResponse = await axios.head(url);
        const totalSize = parseInt(headResponse.headers["content-length"], 10);

        if (isNaN(totalSize)) {
            statusMessage = "Error: Unable to determine file size.";
            return res.status(400).send("Unable to determine file size. Make sure the URL is valid.");
        }

        let uploadedSize = 0; // Track uploaded bytes

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
                    statusMessage = `Uploading... ${percent}% (${uploadedSize}/${totalSize} bytes)`;
                });

                response.data.on("end", () => {
                    statusMessage = "Upload complete!";
                });

                client.put(response.data, destination, (err) => {
                    if (err) {
                        statusMessage = "Failed to upload file to FTP.";
                        res.status(500).send("Failed to upload file to FTP.");
                    } else {
                        statusMessage = "File successfully uploaded to FTP!";
                        res.send("File successfully uploaded to FTP!");
                    }
                    client.end();
                });
            } catch (downloadErr) {
                statusMessage = "Error fetching file: " + downloadErr.message;
                res.status(500).send("Error fetching file: " + downloadErr.message);
                client.end();
            }
        });

        client.on("error", (err) => {
            statusMessage = "FTP connection error: " + err.message;
            res.status(500).send("FTP connection error: " + err.message);
        });

        client.connect(ftpConfig);
    } catch (err) {
        statusMessage = "Error: " + err.message;
        res.status(500).send("Error: " + err.message);
    }
});

// Start the server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
