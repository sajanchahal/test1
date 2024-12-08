const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const ftp = require("ftp");

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
        // Fetch the file from the URL
        const response = await axios({
            url: fileUrl,
            method: "GET",
            responseType: "arraybuffer",
        });

        const fileName = fileUrl.split("/").pop(); // Extract file name from URL
        const fileData = response.data;

        // Connect to FTP and upload file
        const client = new ftp();
        client.on("ready", () => {
            client.put(fileData, fileName, (err) => {
                if (err) {
                    res.status(500).send("Failed to upload file to FTP.");
                } else {
                    res.send("File successfully uploaded to FTP!");
                }
                client.end();
            });
        });

        client.on("error", (err) => {
            res.status(500).send("FTP connection error: " + err.message);
        });

        client.connect(ftpConfig);
    } catch (err) {
        res.status(500).send("Error fetching file: " + err.message);
    }
});

// Start the server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
