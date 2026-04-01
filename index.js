const express = require('express');
const os = require('os');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 80;

// 1. Create local uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 2. Make the uploads folder publicly viewable (so you can click and view images)
app.use('/uploads', express.static(uploadDir));

// 3. Configure Multer to save files locally
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        // Keeps the original name but adds a timestamp so files don't overwrite each other
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

function getInternalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'Unknown';
}

// ---------------------------------------------------------
// ROUTE 1: The Server Dashboard (Reads from Local Disk)
// ---------------------------------------------------------
app.get('/', (req, res) => {
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMem = (totalMem - freeMem).toFixed(2);
    
    let fileRowsHTML = '<p style="color: #8b949e;">No files on server yet.</p>';
    
    try {
        // Read the files directly from the EC2 hard drive
        const files = fs.readdirSync(uploadDir);
        
        // Filter out hidden files and sort them (newest first, based on our timestamp naming)
        const validFiles = files.filter(f => !f.startsWith('.')).sort().reverse().slice(0, 10);
        
        if (validFiles.length > 0) {
            fileRowsHTML = validFiles.map(file => `
                <p style="margin: 5px 0; font-size: 14px;">
                    📄 <a href="/uploads/${file}" target="_blank" style="color: #58a6ff; text-decoration: none;"><b>${file}</b></a>
                </p>
            `).join('');
        }
    } catch (err) {
        fileRowsHTML = `<p style="color: red;">Error reading disk: ${err.message}</p>`;
    }

    res.send(`
        <body style="font-family: 'Segoe UI', sans-serif; background-color: #0d1117; color: #c9d1d9; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px;">
            <div style="background: #161b22; padding: 30px; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 10px 30px rgba(0,0,0,0.8); width: 100%; max-width: 500px;">
                <h1 style="color: #58a6ff; margin-top: 0; text-align: center;">🚀 Standalone EC2 Node</h1>
                
                <div style="background: #21262d; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #3fb950;">
                    <h3 style="margin-top: 0; color: #f0f6fc;">🖥️ Server Identity</h3>
                    <p style="margin: 5px 0;"><b>Hostname:</b> <span style="color: #a5d6ff;">${os.hostname()}</span></p>
                    <p style="margin: 5px 0;"><b>Internal IP:</b> ${getInternalIP()}</p>
                    <p style="margin: 5px 0;"><b>RAM Usage:</b> ${usedMem} GB / ${totalMem} GB</p>
                </div>

                <div style="background: #21262d; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #d2a8ff;">
                    <h3 style="margin-top: 0; color: #f0f6fc;">🗄️ Local Disk Storage (/uploads)</h3>
                    ${fileRowsHTML}
                </div>

                <div style="background: #21262d; padding: 15px; border-radius: 8px; border-left: 4px solid #ff7b72;">
                    <h3 style="margin-top: 0; color: #f0f6fc;">☁️ Upload to Server</h3>
                    <form action="/api/upload" method="POST" enctype="multipart/form-data" style="display: flex; flex-direction: column; gap: 10px;">
                        <input type="file" name="file" required style="color: #c9d1d9; background: #0d1117; padding: 10px; border: 1px solid #30363d; border-radius: 6px;" />
                        <button type="submit" style="background: #238636; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">Upload File</button>
                    </form>
                </div>
            </div>
        </body>
    `);
});

// ---------------------------------------------------------
// ROUTE 2: Local Upload Endpoint (No Database)
// ---------------------------------------------------------
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');
        
        res.send(`
            <body style="font-family: sans-serif; background: #0d1117; color: white; display: flex; justify-content: center; align-items: center; height: 100vh;">
                <div style="text-align: center; background: #161b22; padding: 40px; border-radius: 12px; border: 1px solid #3fb950;">
                    <h1 style="color: #3fb950;">✅ Upload Successful!</h1>
                    <p>File securely saved to the EC2 hard drive.</p>
                    <a href="/" style="color: #58a6ff; text-decoration: none; margin-top: 20px; display: inline-block;">⬅ Return to Dashboard</a>
                </div>
            </body>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send(`<h1 style="color: red;">Upload Failed: ${error.message}</h1>`);
    }
});

app.listen(port, () => console.log(`Standalone server running on port ${port}`));