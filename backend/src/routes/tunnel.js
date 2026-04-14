const express = require('express');
const router = express.Router();

// Store current tunnel URL
let currentTunnelUrl = null;

router.post('/update', (req, res) => {
  const { url } = req.body;
  if (url) {
    currentTunnelUrl = url;
    console.log(`[Tunnel] URL updated: ${url}`);
  }
  res.json({ ok: true });
});

router.get('/url', (req, res) => {
  res.json({ url: currentTunnelUrl });
});

module.exports = router;
module.exports.setUrl = (url) => { currentTunnelUrl = url; };
