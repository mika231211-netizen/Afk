const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

class BotInstance {
  constructor(userId, serverConfig, io) {
    this.userId = userId;
    this.serverId = serverConfig._id.toString();
    this.serverConfig = serverConfig;
    this.io = io;
    this.bot = null;
    this.state = 'stopped';
    this.reconnectTimer = null;
    this.chatHistory = [];
    this.shouldReconnect = true;
    this.nearbyPlayers = [];

    // Feature state
    this.features = {
      autoSneak: serverConfig.features?.autoSneak || false,
      antiAfk: serverConfig.features?.antiAfk !== false,
      autoMine: serverConfig.features?.autoMine || { enabled: false, triggerOnPlayer: true, targetBlocks: [], radius: 5 },
      autoRespond: serverConfig.features?.autoRespond || { enabled: false, triggers: [] },
    };

    this._antiAfkTimer = null;
    this._miningActive = false;
    this._playerScanTimer = null;
  }

  emit(event, data) {
    this.io.to(`user:${this.userId}`).emit(event, { serverId: this.serverId, ...data });
  }

  setState(state, extra = {}) {
    this.state = state;
    this.emit('bot:status', { state, ...extra });
    console.log(`[Bot ${this.serverId}] State: ${state}`);
  }

  addLog(type, message) {
    const entry = { type, message, timestamp: Date.now() };
    this.chatHistory.push(entry);
    if (this.chatHistory.length > 300) this.chatHistory.shift();
    this.emit('bot:chat', entry);
  }

  start() {
    if (this.bot) this.destroy();
    this.shouldReconnect = true;
    this.setState('connecting');

    const cfg = this.serverConfig;
    const botOptions = {
      host: cfg.host,
      port: cfg.port || 25565,
      version: cfg.version || false,
      hideErrors: false,
      checkTimeoutInterval: 60000,
      closeTimeout: 240,
    };

    if (cfg.useMicrosoftAuth) {
      botOptions.auth = 'microsoft';
      botOptions.profilesFolder = require('path').join(require('os').homedir(), '.minecraft-auth');
    } else {
      botOptions.username = cfg.botUsername || 'AFK_Bot';
      botOptions.auth = 'offline';
    }

    try {
      this.bot = mineflayer.createBot(botOptions);
      this.bot.loadPlugin(pathfinder);
      this._setupEvents();
    } catch (err) {
      this.setState('error', { error: err.message });
    }
  }

  _setupEvents() {
    const bot = this.bot;

    bot.on('login', () => {
      this.setState('online', { username: bot.username });
      this.addLog('system', `✅ Verbunden als ${bot.username}`);
      this._startFeatures();
    });

    // Microsoft device code auth
    bot.on('microsoft_auth_code', ({ link, code }) => {
      this.addLog('auth', `🔐 Microsoft Auth erforderlich! Öffne: ${link} und gib Code ein: ${code}`);
      this.emit('bot:auth_code', { link, code });
    });

    bot.on('chat', (username, message) => {
      if (username === bot.username) return;
      this.addLog('chat', `<${username}> ${message}`);
      this._handleAutoRespond(username, message);
    });

    bot.on('message', (jsonMsg) => {
      const text = jsonMsg.toString();
      if (text && text.trim()) this.addLog('message', text);
    });

    bot.on('playerJoined', (player) => {
      if (player.username !== bot.username) {
        this.addLog('system', `👤 ${player.username} hat den Server betreten`);
        this._updateNearbyPlayers();
      }
    });

    bot.on('playerLeft', (player) => {
      this.addLog('system', `👋 ${player.username} hat den Server verlassen`);
      this._updateNearbyPlayers();
    });

    bot.on('error', (err) => {
      this.setState('error', { error: err.message });
      this.addLog('error', `❌ Fehler: ${err.message}`);
      console.error(`[Bot ${this.serverId}] Error:`, err.message);
    });

    bot.on('kicked', (reason) => {
      this.addLog('error', `🚫 Gekickt: ${reason}`);
    });

    bot.on('end', (reason) => {
      this._stopFeatures();
      this.addLog('system', `🔌 Verbindung getrennt: ${reason || 'unbekannt'}`);
      if (this.shouldReconnect && this.serverConfig.autoReconnect) {
        const delay = this.serverConfig.reconnectDelay || 5000;
        this.setState('reconnecting', { reason });
        this.addLog('system', `🔄 Reconnect in ${delay / 1000}s...`);
        this.reconnectTimer = setTimeout(() => this.start(), delay);
      } else {
        this.setState('stopped');
      }
    });

    // Player scan every 3 seconds
    this._playerScanTimer = setInterval(() => this._updateNearbyPlayers(), 3000);
  }

  _updateNearbyPlayers() {
    if (!this.bot || this.state !== 'online') return;
    try {
      const players = Object.values(this.bot.players || {})
        .filter(p => p.username !== this.bot.username && p.entity)
        .map(p => ({
          username: p.username,
          distance: p.entity ? Math.round(this.bot.entity.position.distanceTo(p.entity.position)) : null,
          gamemode: p.gamemode,
        }))
        .sort((a, b) => (a.distance || 999) - (b.distance || 999));

      this.nearbyPlayers = players;
      this.emit('bot:players', { players });

      // Trigger auto-mine if player nearby
      if (this.features.autoMine.enabled && this.features.autoMine.triggerOnPlayer) {
        const closePlayer = players.find(p => p.distance !== null && p.distance <= (this.features.autoMine.radius * 3));
        if (closePlayer && !this._miningActive) {
          this.addLog('action', `⛏️ Spieler ${closePlayer.username} in der Nähe – starte Auto-Mine`);
          this._startAutoMine();
        } else if (!closePlayer && this._miningActive) {
          this.addLog('action', `⛏️ Kein Spieler mehr in der Nähe – stoppe Auto-Mine`);
          this._stopAutoMine();
        }
      }
    } catch {}
  }

  _startFeatures() {
    // Auto Sneak
    if (this.features.autoSneak) {
      this.bot.setControlState('sneak', true);
      this.addLog('action', '🦵 Auto-Sneak aktiviert');
    }

    // Anti-AFK
    if (this.features.antiAfk) {
      this._startAntiAfk();
    }

    // Auto-Mine (ohne Player-Trigger)
    if (this.features.autoMine.enabled && !this.features.autoMine.triggerOnPlayer) {
      this._startAutoMine();
    }
  }

  _stopFeatures() {
    this._stopAntiAfk();
    this._stopAutoMine();
    clearInterval(this._playerScanTimer);
    this._playerScanTimer = null;
  }

  _startAntiAfk() {
    const interval = (this.serverConfig.features?.antiAfkInterval || 30) * 1000;
    this._antiAfkTimer = setInterval(() => {
      if (!this.bot || this.state !== 'online') return;
      try {
        // Random small movement
        const actions = ['forward', 'back', 'left', 'right'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        this.bot.setControlState(action, true);
        setTimeout(() => {
          try { this.bot?.setControlState(action, false); } catch {}
        }, 500 + Math.random() * 500);

        // Random look
        const yaw = (Math.random() - 0.5) * Math.PI;
        const pitch = (Math.random() - 0.5) * 0.5;
        this.bot.look(this.bot.entity.yaw + yaw, pitch, false);
      } catch {}
    }, interval);
    this.addLog('action', `🔄 Anti-AFK gestartet (alle ${this.serverConfig.features?.antiAfkInterval || 30}s)`);
  }

  _stopAntiAfk() {
    if (this._antiAfkTimer) {
      clearInterval(this._antiAfkTimer);
      this._antiAfkTimer = null;
    }
  }

  _startAutoMine() {
    if (this._miningActive) return;
    this._miningActive = true;
    this._mineLoop();
  }

  _stopAutoMine() {
    this._miningActive = false;
    try { this.bot?.pathfinder?.stop(); } catch {}
  }

  // Equip best pickaxe from inventory/hotbar
  async _equipBestPickaxe() {
    if (!this.bot) return null;
    const pickaxeOrder = [
      'netherite_pickaxe', 'diamond_pickaxe', 'iron_pickaxe',
      'stone_pickaxe', 'golden_pickaxe', 'wooden_pickaxe'
    ];
    for (const name of pickaxeOrder) {
      const item = this.bot.inventory.items().find(i => i.name === name);
      if (item) {
        try {
          await this.bot.equip(item, 'hand');
          return name;
        } catch {}
      }
    }
    return null;
  }

  // Check if block matches any target
  _blockMatches(blockName, targets) {
    for (const t of targets) {
      if (blockName === t) return true;
      if ((t === 'spawner' || t === 'mob_spawner') &&
          (blockName === 'spawner' || blockName === 'mob_spawner')) return true;
      if (t.includes('spawner') && blockName.includes('spawner')) return true;
    }
    return false;
  }

  // Navigate to a position
  async _navigateTo(x, y, z, timeout = 10000) {
    return new Promise((resolve) => {
      try {
        const mcData = require('minecraft-data')(this.bot.version);
        const movements = new Movements(this.bot, mcData);
        movements.canDig = false; // don't dig while navigating
        this.bot.pathfinder.setMovements(movements);
        const goal = new goals.GoalNear(x, y, z, 2);
        this.bot.pathfinder.setGoal(goal);
        const timer = setTimeout(() => {
          try { this.bot.pathfinder.setGoal(null); } catch {}
          resolve(false);
        }, timeout);
        this.bot.once('goal_reached', () => { clearTimeout(timer); resolve(true); });
        this.bot.pathfinder.on('path_update', (r) => {
          if (r.status === 'noPath') { clearTimeout(timer); resolve(false); }
        });
      } catch { resolve(false); }
    });
  }

  async _mineLoop() {
    let blocksMined = 0;
    this.addLog('action', '⛏️ Auto-Mine gestartet');

    while (this._miningActive && this.bot && this.state === 'online') {
      try {
        const targets = this.features.autoMine.targetBlocks;
        if (!targets || targets.length === 0) {
          await this._sleep(2000);
          continue;
        }

        // Find nearest target block
        let found = null;
        let minDist = Infinity;
        for (const blockName of targets) {
          const block = this.bot.findBlock({
            matching: (b) => this._blockMatches(b.name, [blockName]),
            maxDistance: this.features.autoMine.radius || 8,
          });
          if (block) {
            const dist = this.bot.entity.position.distanceTo(block.position);
            if (dist < minDist) { minDist = dist; found = block; }
          }
        }

        if (!found) {
          // No blocks nearby - deposit if we have items
          if (blocksMined > 0) {
            await this._depositToEnderChest();
            blocksMined = 0;
          }
          await this._sleep(1500);
          continue;
        }

        this.addLog('action', `⛏️ Ziel: ${found.name} (${Math.round(minDist)}m entfernt)`);

        // Equip pickaxe
        const pickaxe = await this._equipBestPickaxe();
        if (!pickaxe) {
          this.addLog('action', '⛏️ Keine Spitzhacke im Inventar!');
          await this._sleep(3000);
          continue;
        }

        // Navigate to block
        await this._navigateTo(found.position.x, found.position.y, found.position.z, 12000);
        if (!this._miningActive) break;

        // Re-check block still exists
        const blockStillThere = this.bot.blockAt(found.position);
        if (!blockStillThere || !this._blockMatches(blockStillThere.name, targets)) {
          await this._sleep(200);
          continue;
        }

        // Re-equip pickaxe right before digging
        await this._equipBestPickaxe();
        await this._sleep(150);

        // Look at block
        await this.bot.lookAt(found.position.offset(0.5, 0.5, 0.5));
        await this._sleep(100);

        // Dig
        try {
          await this.bot.dig(blockStillThere);
          blocksMined++;
          this.addLog('action', `✅ ${found.name} abgebaut (${blocksMined} total)`);
        } catch (digErr) {
          this.addLog('action', `⚠️ Abbau fehlgeschlagen: ${digErr.message}`);
        }

        await this._sleep(300);

        // Deposit every 10 blocks
        if (blocksMined >= 10) {
          await this._depositToEnderChest();
          blocksMined = 0;
        }

      } catch (err) {
        this.addLog('action', `⚠️ Mine-Fehler: ${err.message}`);
        await this._sleep(2000);
      }
    }
    this.addLog('action', '⛏️ Auto-Mine gestoppt');
  }

  async _depositToEnderChest() {
    if (!this.bot || this.state !== 'online') return;
    try {
      // Find ender chest nearby (search radius 20)
      const enderChest = this.bot.findBlock({
        matching: (b) => b.name === 'ender_chest',
        maxDistance: 20,
      });

      if (!enderChest) {
        this.addLog('action', '📦 Keine Ender Chest in der Nähe (Radius 20)');
        return;
      }

      this.addLog('action', `📦 Ender Chest gefunden – navigiere hin`);

      // Navigate to ender chest
      await this._navigateTo(
        enderChest.position.x,
        enderChest.position.y,
        enderChest.position.z,
        12000
      );

      await this._sleep(400);

      // Look at chest
      await this.bot.lookAt(enderChest.position.offset(0.5, 0.5, 0.5));
      await this._sleep(300);

      // Open chest
      let chest;
      try {
        chest = await this.bot.openContainer(enderChest);
      } catch (e) {
        this.addLog('action', `📦 Konnte Ender Chest nicht öffnen: ${e.message}`);
        return;
      }

      await this._sleep(600);

      // Deposit ALL items except tools, armor, food
      const keepItems = [
        'pickaxe', 'axe', 'sword', 'shovel', 'hoe', 'helmet', 'chestplate',
        'leggings', 'boots', 'shield', 'bread', 'apple', 'cooked', 'food',
        'ender_chest', 'torch', 'crafting_table'
      ];

      let deposited = 0;
      const items = [...this.bot.inventory.items()];

      for (const item of items) {
        const shouldKeep = keepItems.some(k => item.name.includes(k));
        if (!shouldKeep) {
          try {
            await chest.deposit(item.type, null, item.count);
            deposited += item.count;
            await this._sleep(150);
          } catch {}
        }
      }

      chest.close();
      await this._sleep(300);

      if (deposited > 0) {
        this.addLog('action', `📦 ${deposited} Items in Ender Chest eingelagert ✅`);
      } else {
        this.addLog('action', `📦 Inventar bereits leer`);
      }

    } catch (err) {
      this.addLog('action', `📦 Ender Chest Fehler: ${err.message}`);
    }
  }

  _handleAutoRespond(username, message) {
    if (!this.features.autoRespond.enabled) return;
    const triggers = this.features.autoRespond.triggers || [];
    for (const t of triggers) {
      if (message.toLowerCase().includes(t.keyword.toLowerCase())) {
        setTimeout(() => {
          try {
            this.bot?.chat(t.response);
            this.addLog('action', `💬 Auto-Antwort an ${username}: ${t.response}`);
          } catch {}
        }, 500 + Math.random() * 1000);
        break;
      }
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Toggle features live
  toggleFeature(feature, value) {
    switch (feature) {
      case 'autoSneak':
        this.features.autoSneak = value;
        if (this.bot && this.state === 'online') {
          this.bot.setControlState('sneak', value);
          this.addLog('action', `🦵 Auto-Sneak ${value ? 'aktiviert' : 'deaktiviert'}`);
        }
        break;
      case 'antiAfk':
        this.features.antiAfk = value;
        if (value) this._startAntiAfk();
        else this._stopAntiAfk();
        this.addLog('action', `🔄 Anti-AFK ${value ? 'aktiviert' : 'deaktiviert'}`);
        break;
      case 'autoMine':
        this.features.autoMine.enabled = value;
        if (value && !this.features.autoMine.triggerOnPlayer) this._startAutoMine();
        else if (!value) this._stopAutoMine();
        this.addLog('action', `⛏️ Auto-Mine ${value ? 'aktiviert' : 'deaktiviert'}`);
        break;
    }
  }

  updateAutoMineBlocks(blocks) {
    this.features.autoMine.targetBlocks = blocks;
    this.addLog('action', `⛏️ Ziel-Blöcke aktualisiert: ${blocks.join(', ')}`);
  }

  stop() {
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimer);
    this._stopFeatures();
    this.destroy();
    this.setState('stopped');
  }

  destroy() {
    if (this.bot) {
      try { this.bot.quit(); } catch {}
      this.bot.removeAllListeners();
      this.bot = null;
    }
  }

  sendChat(message) {
    if (this.state !== 'online' || !this.bot) return false;
    this.bot.chat(message);
    return true;
  }

  getStatus() {
    return {
      state: this.state,
      serverId: this.serverId,
      chatHistory: this.chatHistory,
      nearbyPlayers: this.nearbyPlayers,
      features: this.features,
    };
  }
}

class BotManager {
  constructor(io) {
    this.io = io;
    this.bots = new Map();
  }

  _key(userId, serverId) { return `${userId}:${serverId}`; }

  startBot(userId, serverConfig) {
    const key = this._key(userId, serverConfig._id.toString());
    if (this.bots.has(key)) this.bots.get(key).stop();
    const instance = new BotInstance(userId, serverConfig, this.io);
    this.bots.set(key, instance);
    instance.start();
  }

  stopBot(userId, serverId) {
    const key = this._key(userId, serverId);
    const instance = this.bots.get(key);
    if (instance) { instance.stop(); this.bots.delete(key); }
  }

  restartBot(userId, serverConfig) {
    const key = this._key(userId, serverConfig._id.toString());
    const instance = this.bots.get(key);
    if (instance) instance.stop();
    this.startBot(userId, serverConfig);
  }

  toggleFeature(userId, serverId, feature, value) {
    const key = this._key(userId, serverId);
    this.bots.get(key)?.toggleFeature(feature, value);
  }

  updateAutoMineBlocks(userId, serverId, blocks) {
    const key = this._key(userId, serverId);
    this.bots.get(key)?.updateAutoMineBlocks(blocks);
  }

  sendChat(userId, serverId, message) {
    const key = this._key(userId, serverId);
    return this.bots.get(key)?.sendChat(message) || false;
  }

  getStatus(userId, serverId) {
    const key = this._key(userId, serverId);
    return this.bots.get(key)?.getStatus() || { state: 'stopped', serverId };
  }
}

module.exports = BotManager;
