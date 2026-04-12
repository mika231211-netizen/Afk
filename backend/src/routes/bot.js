const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/status/:serverId', (req, res) => {
  const status = global.botManager?.getStatus(req.user.id, req.params.serverId);
  res.json(status || { state: 'stopped', serverId: req.params.serverId });
});

router.post('/start/:serverId', async (req, res) => {
  try {
    const server = await Server.findOne({ _id: req.params.serverId, userId: req.user.id });
    if (!server) return res.status(404).json({ error: 'Server nicht gefunden' });
    global.botManager?.startBot(req.user.id, server);
    res.json({ message: 'Bot startet...' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/stop/:serverId', (req, res) => {
  global.botManager?.stopBot(req.user.id, req.params.serverId);
  res.json({ message: 'Bot gestoppt' });
});

router.post('/restart/:serverId', async (req, res) => {
  try {
    const server = await Server.findOne({ _id: req.params.serverId, userId: req.user.id });
    if (!server) return res.status(404).json({ error: 'Server nicht gefunden' });
    global.botManager?.restartBot(req.user.id, server);
    res.json({ message: 'Bot neugestartet' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/chat/:serverId', (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Nachricht fehlt' });
  const sent = global.botManager?.sendChat(req.user.id, req.params.serverId, message);
  if (!sent) return res.status(400).json({ error: 'Bot ist nicht verbunden' });
  res.json({ message: 'Gesendet' });
});

// Toggle a feature live
router.post('/feature/:serverId', async (req, res) => {
  try {
    const { feature, value } = req.body;
    const server = await Server.findOne({ _id: req.params.serverId, userId: req.user.id });
    if (!server) return res.status(404).json({ error: 'Server nicht gefunden' });

    // Persist to DB
    const featureMap = {
      autoSneak: 'features.autoSneak',
      antiAfk: 'features.antiAfk',
      autoMine: 'features.autoMine.enabled',
    };
    if (featureMap[feature]) {
      await Server.updateOne({ _id: server._id }, { $set: { [featureMap[feature]]: value } });
    }

    // Apply live
    global.botManager?.toggleFeature(req.user.id, req.params.serverId, feature, value);
    res.json({ message: 'Feature aktualisiert' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update auto-mine target blocks
router.post('/mine-blocks/:serverId', async (req, res) => {
  try {
    const { blocks } = req.body;
    await Server.updateOne(
      { _id: req.params.serverId, userId: req.user.id },
      { $set: { 'features.autoMine.targetBlocks': blocks } }
    );
    global.botManager?.updateAutoMineBlocks(req.user.id, req.params.serverId, blocks);
    res.json({ message: 'Blöcke aktualisiert' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
