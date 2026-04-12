const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  host: { type: String, required: true, trim: true },
  port: { type: Number, default: 25565 },
  botUsername: { type: String, trim: true }, // nur für offline-mode
  useMicrosoftAuth: { type: Boolean, default: false },
  microsoftEmail: { type: String, trim: true },
  version: { type: String, default: '1.20.1' },
  autoReconnect: { type: Boolean, default: true },
  reconnectDelay: { type: Number, default: 5000 },

  // Bot Features
  features: {
    autoSneak: { type: Boolean, default: false },
    antiAfk: { type: Boolean, default: true },
    antiAfkInterval: { type: Number, default: 30 }, // seconds
    autoMine: {
      enabled: { type: Boolean, default: false },
      triggerOnPlayer: { type: Boolean, default: true }, // mine when player nearby
      targetBlocks: { type: [String], default: [] }, // e.g. ['diamond_ore', 'iron_ore']
      radius: { type: Number, default: 5 },
    },
    autoRespond: {
      enabled: { type: Boolean, default: false },
      triggers: { type: [{ keyword: String, response: String }], default: [] },
    },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Server', serverSchema);
