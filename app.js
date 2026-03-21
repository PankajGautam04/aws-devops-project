const express = require('express');
const os = require('os');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mysql = require('mysql2/promise'); // Added MySQL driver

const app = express();
const port = 80;

// ---------------------------------------------------------
// 1. CLOUD CONFIGURATIONS (S3 & RDS)
// ---------------------------------------------------------
const s3 = new S3Client({ region: 'ap-south-1' });
const upload = multer({ storage: multer.memoryStorage() });

// Set up the RDS Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,           // Injected by Terraform
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'DevOps12345!',
    database: 'mysql',                   
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Auto-create a table to store our file metadata
async function initDB() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS file_uploads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                original_filename VARCHAR(255) NOT NULL,
                s3_key VARCHAR(255) NOT NULL,
                upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        connection.release();
        console.log('✅ Database connected and "file_uploads" table is ready!');
    } catch (err) {
        console.error('❌ Database initialization failed. Check your connection string!', err.message);
    }
}
initDB();

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
// ROUTE 1: The Ultimate Server Dashboard
// ---------------------------------------------------------
app.get('/', async (req, res) => {
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMem = (totalMem - freeMem).toFixed(2);
    
    let dbRowsHTML = '<p style="color: #8b949e;">No files in database yet.</p>';
    try {
        const [rows] = await pool.query('SELECT * FROM file_uploads ORDER BY upload_time DESC LIMIT 5');
        if (rows.length > 0) {
            dbRowsHTML = rows.map(row => `<p style="margin: 2px 0; font-size: 14px;">📄 <b>${row.original_filename}</b> (ID: ${row.id})</p>`).join('');
        }
    } catch (err) {
        dbRowsHTML = `<p style="color: red;">Database disconnected: ${err.message}</p>`;
    }

    res.send(`
        <body style="font-family: 'Segoe UI', sans-serif; background-color: #0d1117; color: #c9d1d9; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px;">
            <div style="background: #161b22; padding: 30px; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 10px 30px rgba(0,0,0,0.8); width: 100%; max-width: 500px;">
                <h1 style="color: #58a6ff; margin-top: 0; text-align: center;">🚀 AWS Cloud Dashboard</h1>
                
                <div style="background: #21262d; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #3fb950;">
                    <h3 style="margin-top: 0; color: #f0f6fc;">🖥️ Container Identity</h3>
                    <p style="margin: 5px 0;"><b>Pod Name:</b> <span style="color: #a5d6ff;">${os.hostname()}</span></p>
                    <p style="margin: 5px 0;"><b>Internal IP:</b> ${getInternalIP()}</p>
                    <p style="margin: 5px 0;"><b>RAM Usage:</b> ${usedMem} GB / ${totalMem} GB</p>
                </div>

                <div style="background: #21262d; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #d2a8ff;">
                    <h3 style="margin-top: 0; color: #f0f6fc;">🗄️ Recent RDS Database Entries</h3>
                    ${dbRowsHTML}
                </div>

                <div style="background: #21262d; padding: 15px; border-radius: 8px; border-left: 4px solid #ff7b72;">
                    <h3 style="margin-top: 0; color: #f0f6fc;">☁️ Upload to S3 & RDS</h3>
                    <form action="/api/upload" method="POST" enctype="multipart/form-data" style="display: flex; flex-direction: column; gap: 10px;">
                        <input type="file" name="file" required style="color: #c9d1d9; background: #0d1117; padding: 10px; border: 1px solid #30363d; border-radius: 6px;" />
                        <button type="submit" style="background: #238636; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">Push to Cloud</button>
                    </form>
                </div>
            </div>
        </body>
    `);
});

// ---------------------------------------------------------
// ROUTE 2: S3 + RDS File Upload Endpoint
// ---------------------------------------------------------
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');

        const uniqueFileName = `${Date.now()}-${req.file.originalname}`;
        
        // 1. Upload the physical file to AWS S3
        const command = new PutObjectCommand({
            Bucket: 'web-app-pankaj--aps1-az1--x-s3', 
            Key: uniqueFileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        });
        await s3.send(command);
        
        // 2. Insert the file metadata into AWS RDS Database
        await pool.query(
            'INSERT INTO file_uploads (original_filename, s3_key) VALUES (?, ?)', 
            [req.file.originalname, uniqueFileName]
        );
        
        res.send(`
            <body style="font-family: sans-serif; background: #0d1117; color: white; display: flex; justify-content: center; align-items: center; height: 100vh;">
                <div style="text-align: center; background: #161b22; padding: 40px; border-radius: 12px; border: 1px solid #3fb950;">
                    <h1 style="color: #3fb950;">✅ Cloud Upload Successful!</h1>
                    <p>File physically saved in <b>AWS S3</b>.</p>
                    <p>Metadata recorded in <b>AWS RDS MySQL</b>.</p>
                    <a href="/" style="color: #58a6ff; text-decoration: none; margin-top: 20px; display: inline-block;">⬅ Return to Dashboard</a>
                </div>
            </body>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send(`<h1 style="color: red;">Upload Failed: ${error.message}</h1>`);
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));