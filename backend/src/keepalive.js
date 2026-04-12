// Pings itself every 14 minutes to prevent Render free tier from sleeping
const https = require('https');
const http = require('http');

function keepAlive(url) {
  if (!url) return;
  setInterval(() => {
    const client = url.startsWith('https') ? https : http;
    client.get(`${url}/api/health`, (res) => {
      console.log(`[KeepAlive] Ping ${res.statusCode}`);
    }).on('error', () => {});
  }, 14 * 60 * 1000); // every 14 minutes
  console.log('[KeepAlive] Started - pinging every 14 minutes');
}

module.exports = keepAlive;
