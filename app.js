const express = require('express');
const os = require('os');
const app = express();
const port = 80;

app.get('/', (req, res) => {
    // Logic to calculate system health
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMem = (totalMem - freeMem).toFixed(2);
    
    res.send(`
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d1117; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="background: #161b22; padding: 40px; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; width: 400px;">
                <h1 style="color: #58a6ff; margin-bottom: 20px;">🚀 DevOps Dashboard</h1>
                <div style="background: #21262d; padding: 15px; border-radius: 8px; margin-bottom: 10px; text-align: left;">
                    <p><b>Status:</b> <span style="color: #3fb950;">● Healthy</span></p>
                    <p><b>Container OS:</b> ${os.type()} ${os.arch()}</p>
                    <p><b>RAM Usage:</b> ${usedMem}GB / ${totalMem}GB</p>
                    <p><b>CPU Cores:</b> ${os.cpus().length}</p>
                    <p><b>Uptime:</b> ${(os.uptime() / 3600).toFixed(2)} hrs</p>
                </div>
                <p style="font-size: 0.8em; color: #8b949e;">Deployed via <b>GitHub Actions</b> to <b>AWS EC2</b></p>
            </div>
        </body>
    `);
});

app.listen(port, () => console.log(`Server running on port ${port}`));
