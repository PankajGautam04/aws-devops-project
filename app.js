const express = require('express');
const os = require('os');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const port = 80;

// Configure AWS S3 and Multer
const s3 = new S3Client({ region: 'ap-south-1' });
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to get the Pod's internal IP address
function getInternalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'Unknown';
}

// ROUTE 1: The Ultimate Server Dashboard
app.get('/', (req, res) => {
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMem = (totalMem - freeMem).toFixed(2);
    
    const uptime = os.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    const loadAvg = os.loadavg().map(n => n.toFixed(2)).join(', ');

    res.send(`
        <body style="font-family: 'Segoe UI', sans-serif; background-color: #0d1117; color: #c9d1d9; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px;">
            <div style="background: #161b22; padding: 30px; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 10px 30px rgba(0,0,0,0.8); width: 100%; max-width: 500px;">
                <h1 style="color: #58a6ff; margin-top: 0; text-align: center;">🚀 AWS EKS Dashboard</h1>
                
                <div style="background: #21262d; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #3fb950;">
                    <h3 style="margin-top: 0; color: #f0f6fc;">🖥️ Kubernetes Pod Identity</h3>
                    <p style="margin: 5px 0;"><b>Pod Name:</b> <span style="color: #a5d6ff;">${os.hostname()}</span></p>
                    <p style="margin: 5px 0;"><b>Internal IP:</b> ${getInternalIP()}</p>
                    <p style="margin: 5px 0;"><b>Status:</b> <span style="color: #3fb950;">● Healthy</span></p>
                </div>

                <div style="background: #21262d; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #d2a8ff;">
                    <h3 style="margin-top: 0; color: #f0f6fc;">⚙️ Hardware & Telemetry</h3>
                    <p style="margin: 5px 0;"><b>CPU Cores:</b> ${os.cpus().length} vCPUs</p>
                    <p style="margin: 5px 0;"><b>CPU Load:</b> ${loadAvg}</p>
                    <p style="margin: 5px 0;"><b>RAM Usage:</b> ${usedMem} GB / ${totalMem} GB</p>
                    <p style="margin: 5px 0;"><b>OS Platform:</b> ${os.platform()} (${os.release()})</p>
                    <p style="margin: 5px 0;"><b>Pod Uptime:</b> ${uptimeHours}h ${uptimeMinutes}m</p>
                </div>

                <div style="background: #21262d; padding: 15px; border-radius: 8px; border-left: 4px solid #ff7b72;">
                    <h3 style="margin-top: 0; color: #f0f6fc;">☁️ Test S3 Upload</h3>
                    <form action="/api/upload" method="POST" enctype="multipart/form-data" style="display: flex; flex-direction: column; gap: 10px;">
                        <input type="file" name="file" required style="color: #c9d1d9; background: #0d1117; padding: 10px; border: 1px solid #30363d; border-radius: 6px;" />
                        <button type="submit" style="background: #238636; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">Push to Amazon S3</button>
                    </form>
                </div>
            </div>
        </body>
    `);
});

// ROUTE 2: S3 File Upload Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');

        const uniqueFileName = `${Date.now()}-${req.file.originalname}`;
        const command = new PutObjectCommand({
            // 🚨 CRITICAL: CHANGE THIS TO YOUR ACTUAL NEW S3 BUCKET NAME!
            Bucket: 'YOUR-NEW-BUCKET-NAME-HERE', 
            Key: uniqueFileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        });

        await s3.send(command);
        
        res.send(`
            <body style="font-family: sans-serif; background: #0d1117; color: white; display: flex; justify-content: center; align-items: center; height: 100vh;">
                <div style="text-align: center; background: #161b22; padding: 40px; border-radius: 12px; border: 1px solid #3fb950;">
                    <h1 style="color: #3fb950;">✅ Upload Successful!</h1>
                    <p>File <b>${uniqueFileName}</b> is now in AWS S3.</p>
                    <a href="/" style="color: #58a6ff; text-decoration: none; margin-top: 20px; display: inline-block;">⬅ Return to Dashboard</a>
                </div>
            </body>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('<h1 style="color: red;">Failed to upload to S3</h1>');
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));