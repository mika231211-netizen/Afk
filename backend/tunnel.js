// Self-contained tunnel using localtunnel API directly
const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');

const LOCAL_PORT = process.env.PORT || 3001;

async function getTunnel() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.localtunnel.me',
      path: '/?new',
      method: 'GET',
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function createTunnel(tunnelHost, tunnelPort, localPort) {
  function connect() {
    const remote = net.connect({ host: tunnelHost, port: tunnelPort });
    const local = net.connect({ host: '127.0.0.1', port: localPort });

    remote.pipe(local);
    local.pipe(remote);

    remote.on('error', () => { setTimeout(connect, 2000); });
    local.on('error', () => { remote.destroy(); setTimeout(connect, 2000); });
    remote.on('close', () => { local.destroy(); setTimeout(connect, 1000); });
  }
  // Open multiple connections for better throughput
  for (let i = 0; i < 10; i++) connect();
}

async function main() {
  console.log('[Tunnel] Requesting tunnel...');
  try {
    const info = await getTunnel();
    console.log(`[Tunnel] ✅ Public URL: ${info.url}`);
    console.log(`[Tunnel] Share this URL with your frontend!`);
    
    const parsed = new URL(info.url);
    createTunnel(parsed.hostname, info.port || 443, LOCAL_PORT);
    
    // Keep alive
    setInterval(async () => {
      try {
        await getTunnel();
      } catch {}
    }, 60000);
    
  } catch(err) {
    console.error('[Tunnel] Failed:', err.message);
    setTimeout(main, 5000);
  }
}

main();
