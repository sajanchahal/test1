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
            <button type="submit">Upload</button>
        </form>
    `);
});

// Handle file upload
app.post("/upload", async (req, res) => {
    const fileUrl = req.body.url;

    try {
        const fileName = fileUrl.split("/").pop(); // Extract file name from URL

        // Set up FTP client
        const client = new FTPClient();
        client.on("ready", async () => {
            try {
                // Stream the file directly from the URL to the FTP server
                const response = await axios({
                    url: fileUrl,
                    method: "GET",
                    responseType: "stream",
                });

                client.put(response.data, fileName, (err) => {
                    if (err) {
                        res.status(500).send("Failed to upload file to FTP.");
                    } else {
                        res.send("File successfully uploaded to FTP!");
                    }
                    client.end();
                });
            } catch (downloadErr) {
                res.status(500).send("Error fetching file: " + downloadErr.message);
                client.end();
            }
        });

        client.on("error", (err) => {
            res.status(500).send("FTP connection error: " + err.message);
        });

        client.connect(ftpConfig);
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

// Start the server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
