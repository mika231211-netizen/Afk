require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const keepAlive = require('./keepalive');

const authRoutes = require('./routes/auth');
const botRoutes = require('./routes/bot');
const serverRoutes = require('./routes/servers');
const tunnelRoutes = require('./routes/tunnel');
const { authenticateSocket } = require('./middleware/auth');
const BotManager = require('./bot/BotManager');

const app = express();
const httpServer = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: {
    origin: [FRONTEND_URL, /\.railway\.app$/, /\.render\.com$/, /\.onrender\.com$/],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: [FRONTEND_URL, /\.railway\.app$/, /\.render\.com$/, /\.onrender\.com$/],
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/tunnel', tunnelRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

io.use(authenticateSocket);

io.on('connection', (socket) => {
  const userId = socket.user.id;
  socket.join(`user:${userId}`);
  console.log(`[WS] User ${userId} connected`);
  socket.on('disconnect', () => console.log(`[WS] User ${userId} disconnected`));
});

app.set('io', io);
global.botManager = new BotManager(io);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received, shutting down gracefully');
  httpServer.close(() => process.exit(0));
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('[DB] MongoDB connected');
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] Running on port ${PORT}`);
      // Start keep-alive ping (prevents Render free tier sleep)
      keepAlive(process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL);
    });
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });
