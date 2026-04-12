const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const servers = await Server.find({ userId: req.user.id });
    res.json(servers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, host, port, botUsername, useMicrosoftAuth, microsoftEmail, version, autoReconnect, reconnectDelay, features } = req.body;
    if (!name || !host) return res.status(400).json({ error: 'Name und Host sind erforderlich' });
    if (!useMicrosoftAuth && !botUsername) return res.status(400).json({ error: 'Bot-Benutzername erforderlich (Offline-Modus)' });

    const server = await Server.create({
      userId: req.user.id,
      name, host,
      port: port || 25565,
      botUsername: botUsername || '',
      useMicrosoftAuth: !!useMicrosoftAuth,
      microsoftEmail: microsoftEmail || '',
      version: version || '1.20.1',
      autoReconnect: autoReconnect !== false,
      reconnectDelay: reconnectDelay || 5000,
      features: features || {},
    });
    res.status(201).json(server);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const server = await Server.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!server) return res.status(404).json({ error: 'Server nicht gefunden' });
    res.json(server);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const server = await Server.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!server) return res.status(404).json({ error: 'Server nicht gefunden' });
    global.botManager?.stopBot(req.user.id, req.params.id);
    res.json({ message: 'Server gelöscht' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
