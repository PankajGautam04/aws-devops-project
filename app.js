const express = require('express');
const os = require('os');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const port = 80;

// Configure AWS S3 and Multer (Memory Storage for Kubernetes)
const s3 = new S3Client({ region: 'ap-south-1' });
const upload = multer({ storage: multer.memoryStorage() });

// ROUTE 1: Your Server Dashboard
app.get('/', (req, res) => {
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMem = (totalMem - freeMem).toFixed(2);
    
    res.send(`
        <body style="font-family: 'Segoe UI', sans-serif; background-color: #0d1117; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="background: #161b22; padding: 40px; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; width: 400px;">
                <h1 style="color: #58a6ff; margin-bottom: 20px;">🚀 EKS Server Dashboard</h1>
                <div style="background: #21262d; padding: 15px; border-radius: 8px; margin-bottom: 10px; text-align: left;">
                    <p><b>Status:</b> <span style="color: #3fb950;">● Healthy (Kubernetes Pod)</span></p>
                    <p><b>Container OS:</b> ${os.type()} ${os.arch()}</p>
                    <p><b>RAM Usage:</b> ${usedMem}GB / ${totalMem}GB</p>
                    <p><b>CPU Cores:</b> ${os.cpus().length}</p>
                </div>
                <p style="font-size: 0.8em; color: #8b949e;">Deployed via <b>GitHub Actions</b> to <b>Amazon EKS</b></p>
            </div>
        </body>
    `);
});

// ROUTE 2: S3 File Upload Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

        const uniqueFileName = `${Date.now()}-${req.file.originalname}`;
        const command = new PutObjectCommand({
            Bucket: 'vidyarthi-storage-12345', // <-- UPDATE WITH YOUR ACTUAL BUCKET NAME
            Key: uniqueFileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        });

        await s3.send(command);
        res.status(200).json({ message: 'Success! File sent to S3.', fileName: uniqueFileName });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload to S3' });
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));