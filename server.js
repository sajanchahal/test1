const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const FTPClient = require("ftp");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Store progress for each upload ID
const uploadStatuses = {};

// FTP credentials
const ftpConfig = {
    host: "ftp.serverbyt.in",
    user: "new@dramadekho.xyz",
    password: "jg7hx8qi6t",
};

// Serve the HTML page
app.use(express.static("public")); // Serve static files from the "public" directory

// Upload status variable
let statusMessage = "Waiting for upload...";

// Provide live status updates via SSE
app.get("/status/:uploadId", (req, res) => {
    const uploadId = req.params.uploadId;

    // Check if there's a status message for the given uploadId
    const uploadStatus = uploadStatuses[uploadId] || "No status available for this upload ID.";

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send status message for this uploadId
    res.write(`data: ${uploadStatus}\n\n`);

    // Interval to keep the connection alive
    const interval = setInterval(() => {
        const status = uploadStatuses[uploadId] || "No status available for this upload ID.";
        res.write(`data: ${status}\n\n`);
    }, 1000);

    req.on("close", () => {
        clearInterval(interval);
    });
});

// Convert bytes to KB, MB, or GB
function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
}

// Handle file upload
app.post("/upload", async (req, res) => {
    const { url, path, filename, uploadId } = req.body;
    const destination = `${path}/${filename}`; // Combine path and filename

    // Store initial upload status
    uploadStatuses[uploadId] = "Starting upload...";

    try {
        // Get file size
        const headResponse = await axios.head(url);
        const totalSize = parseInt(headResponse.headers["content-length"], 10);

        if (isNaN(totalSize)) {
            uploadStatuses[uploadId] = "Error: Unable to determine file size.";
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
                    const uploadedFormatted = formatBytes(uploadedSize);
                    const totalFormatted = formatBytes(totalSize);
                    uploadStatuses[uploadId] = `Uploading... ${percent}% (${uploadedFormatted}/${totalFormatted})`;
                });

                response.data.on("end", () => {
                    uploadStatuses[uploadId] = "Upload complete!";
                });

                client.put(response.data, destination, (err) => {
                    if (err) {
                        uploadStatuses[uploadId] = "Failed to upload file to FTP.";
                        res.status(500).send("Failed to upload file to FTP.");
                    } else {
                        uploadStatuses[uploadId] = "File successfully uploaded to FTP!";
                        res.send("File successfully uploaded to FTP!");
                    }
                    client.end();
                });
            } catch (downloadErr) {
                uploadStatuses[uploadId] = "Error fetching file: " + downloadErr.message;
                res.status(500).send("Error fetching file: " + downloadErr.message);
                client.end();
            }
        });

        client.on("error", (err) => {
            uploadStatuses[uploadId] = "FTP connection error: " + err.message;
            res.status(500).send("FTP connection error: " + err.message);
        });

        client.connect(ftpConfig);
    } catch (err) {
        uploadStatuses[uploadId] = "Error: " + err.message;
        res.status(500).send("Error: " + err.message);
    }
});

// Start the server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
