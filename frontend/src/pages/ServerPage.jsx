import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, RotateCcw, Send, Users, Zap, Shield, Pickaxe, MessageSquare, Plus, X, Clock } from 'lucide-react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { useSocket } from '../context/SocketContext';

const chatTypeColors = {
  chat:    'text-white',
  message: 'text-gray-300',
  system:  'text-blue-400',
  error:   'text-red-400',
  action:  'text-yellow-400',
  auth:    'text-purple-400',
};

const BLOCK_SUGGESTIONS = [
  'diamond_ore','deepslate_diamond_ore','iron_ore','deepslate_iron_ore',
  'gold_ore','deepslate_gold_ore','coal_ore','emerald_ore','ancient_debris',
  'oak_log','spruce_log','birch_log','stone','cobblestone','gravel','sand',
  'spawner','mob_spawner',
  'skeleton_spawner','zombie_spawner','spider_spawner','cave_spider_spawner',
  'blaze_spawner','creeper_spawner','enderman_spawner','witch_spawner',
];

function FeatureToggle({ label, icon: Icon, enabled, onToggle, disabled }) {
  return (
    <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
      <div className="flex items-center gap-2">
        <Icon size={16} className={enabled ? 'text-accent-400' : 'text-gray-500'} />
        <span className="text-sm">{label}</span>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-accent-500' : 'bg-dark-500'} disabled:opacity-40`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

export default function ServerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState(null);
  const [status, setStatus] = useState({ state: 'stopped' });
  const [chatLog, setChatLog] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [nearbyPlayers, setNearbyPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState({ autoSneak: false, antiAfk: true, autoMine: false, autoChat: false });
  const [mineBlocks, setMineBlocks] = useState([]);
  const [blockInput, setBlockInput] = useState('');
  const [showBlockSuggestions, setShowBlockSuggestions] = useState(false);
  const [autoChatMsg, setAutoChatMsg] = useState('');
  const [autoChatInterval, setAutoChatInterval] = useState(5);
  const chatEndRef = useRef(null);
  const { on, off } = useSocket();

  useEffect(() => { fetchData(); }, [id]);

  useEffect(() => {
    const onStatus = (data) => { if (data.serverId === id) setStatus(data); };
    const onChat = (data) => { if (data.serverId === id) setChatLog(prev => [...prev.slice(-299), data]); };
    const onPlayers = (data) => { if (data.serverId === id) setNearbyPlayers(data.players || []); };
    const onAuth = (data) => {
      if (data.serverId === id) {
        setChatLog(prev => [...prev, {
          type: 'auth',
          message: `🔐 Microsoft Auth: Öffne ${data.link} und gib Code ein: ${data.code}`,
          timestamp: Date.now(),
        }]);
      }
    };
    on('bot:status', onStatus);
    on('bot:chat', onChat);
    on('bot:players', onPlayers);
    on('bot:auth_code', onAuth);
    return () => { off('bot:status', onStatus); off('bot:chat', onChat); off('bot:players', onPlayers); off('bot:auth_code', onAuth); };
  }, [id, on, off]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatLog]);

  const fetchData = async () => {
    try {
      const [serversRes, statusRes] = await Promise.all([
        api.get('/servers'),
        api.get(`/bot/status/${id}`),
      ]);
      const found = serversRes.data.find(s => s._id === id);
      if (!found) return navigate('/dashboard');
      setServer(found);
      setStatus(statusRes.data);
      setChatLog(statusRes.data.chatHistory || []);
      setNearbyPlayers(statusRes.data.nearbyPlayers || []);
      const f = statusRes.data.features || found.features || {};
      setFeatures({
        autoSneak: f.autoSneak || false,
        antiAfk: f.antiAfk !== false,
        autoMine: f.autoMine?.enabled || false,
        autoChat: f.autoChat?.enabled || false,
      });
      setMineBlocks(found.features?.autoMine?.targetBlocks || []);
      setAutoChatMsg(found.features?.autoChat?.message || '');
      setAutoChatInterval(found.features?.autoChat?.interval || 5);
    } catch { navigate('/dashboard'); }
    finally { setLoading(false); }
  };

  const handleStart = async () => { await api.post(`/bot/start/${id}`); setStatus(s => ({ ...s, state: 'connecting' })); };
  const handleStop = async () => { await api.post(`/bot/stop/${id}`); setStatus(s => ({ ...s, state: 'stopped' })); };
  const handleRestart = async () => { await api.post(`/bot/restart/${id}`); setStatus(s => ({ ...s, state: 'connecting' })); };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try { await api.post(`/bot/chat/${id}`, { message: chatInput }); setChatInput(''); }
    catch (err) { alert(err.response?.data?.error || 'Fehler'); }
  };

  const toggleFeature = async (feature, value) => {
    setFeatures(f => ({ ...f, [feature]: value }));
    try { await api.post(`/bot/feature/${id}`, { feature, value }); }
    catch { setFeatures(f => ({ ...f, [feature]: !value })); }
  };

  const addBlock = (block) => {
    const b = block.trim().toLowerCase().replace(/ /g, '_');
    if (!b || mineBlocks.includes(b)) return;
    const updated = [...mineBlocks, b];
    setMineBlocks(updated);
    api.post(`/bot/mine-blocks/${id}`, { blocks: updated });
    setBlockInput('');
    setShowBlockSuggestions(false);
  };

  const removeBlock = (block) => {
    const updated = mineBlocks.filter(b => b !== block);
    setMineBlocks(updated);
    api.post(`/bot/mine-blocks/${id}`, { blocks: updated });
  };

  const saveAutoChat = async () => {
    await api.post(`/bot/auto-chat/${id}`, { message: autoChatMsg, interval: Number(autoChatInterval) });
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const isRunning = ['online', 'connecting', 'reconnecting'].includes(status.state);
  const isOnline = status.state === 'online';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{server?.name}</h1>
          <p className="text-gray-400 text-sm">
            {server?.host}:{server?.port} ·{' '}
            {server?.useMicrosoftAuth ? '🪟 Microsoft Auth' : `Bot: ${server?.botUsername}`}
          </p>
        </div>
        <StatusBadge state={status.state} />
      </div>

      {/* Controls */}
      <div className="card flex flex-wrap gap-3 items-center">
        {!isRunning ? (
          <button onClick={handleStart} className="btn-primary flex items-center gap-2">
            <Play size={15} /> Starten
          </button>
        ) : (
          <button onClick={handleStop} className="btn-danger flex items-center gap-2">
            <Square size={15} /> Stoppen
          </button>
        )}
        <button onClick={handleRestart} className="btn-secondary flex items-center gap-2">
          <RotateCcw size={15} /> Neustart
        </button>
        {server?.useMicrosoftAuth && (
          <span className="ml-auto text-xs bg-blue-900/30 text-blue-400 border border-blue-700/40 px-2 py-1 rounded">
            🪟 Premium Account
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat - nimmt 2 Spalten */}
        <div className="lg:col-span-2 card flex flex-col" style={{ height: '480px' }}>
          <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <MessageSquare size={14} /> Live Chat & Log
          </h2>
          <div className="flex-1 overflow-y-auto space-y-0.5 font-mono text-xs bg-dark-900 rounded-lg p-3">
            {chatLog.length === 0 ? (
              <p className="text-gray-600 text-center mt-8">Noch keine Nachrichten...</p>
            ) : chatLog.map((entry, i) => (
              <div key={i} className="flex gap-2 leading-5">
                <span className="text-gray-600 shrink-0">{formatTime(entry.timestamp)}</span>
                {entry.username && <span className="text-accent-400 shrink-0">&lt;{entry.username}&gt;</span>}
                <span className={chatTypeColors[entry.type] || 'text-gray-300'}>{entry.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendChat} className="flex gap-2 mt-3">
            <input className="input-field flex-1 text-sm"
              placeholder={isOnline ? 'Nachricht senden...' : 'Bot muss online sein'}
              value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={!isOnline} />
            <button type="submit" disabled={!isOnline || !chatInput.trim()} className="btn-primary px-3">
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* Rechte Spalte */}
        <div className="space-y-4">
          {/* Nearby Players */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Users size={14} /> Spieler in der Nähe
              <span className="ml-auto text-xs text-gray-500">{nearbyPlayers.length}</span>
            </h2>
            {nearbyPlayers.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-3">Keine Spieler in der Nähe</p>
            ) : (
              <div className="space-y-1.5">
                {nearbyPlayers.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-white">{p.username}</span>
                    <span className="text-gray-400 text-xs">{p.distance !== null ? `${p.distance}m` : '?'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feature Toggles */}
          <div className="card space-y-2">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Zap size={14} /> Bot Features
            </h2>
            <FeatureToggle label="Auto-Sneak" icon={Shield} enabled={features.autoSneak}
              onToggle={(v) => toggleFeature('autoSneak', v)} disabled={!isOnline} />
            <FeatureToggle label="Anti-AFK" icon={RotateCcw} enabled={features.antiAfk}
              onToggle={(v) => toggleFeature('antiAfk', v)} disabled={!isOnline} />
            <FeatureToggle label="Auto-Mine" icon={Pickaxe} enabled={features.autoMine}
              onToggle={(v) => toggleFeature('autoMine', v)} disabled={!isOnline} />
            <FeatureToggle label="Auto-Chat" icon={Clock} enabled={features.autoChat}
              onToggle={(v) => toggleFeature('autoChat', v)} disabled={!isOnline} />
          </div>

          {/* Auto-Mine Block Config */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Pickaxe size={14} /> Ziel-Blöcke
            </h2>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {mineBlocks.length === 0 && <p className="text-gray-600 text-xs">Keine Blöcke ausgewählt</p>}
              {mineBlocks.map(b => (
                <span key={b} className="flex items-center gap-1 bg-dark-600 text-xs px-2 py-1 rounded-full">
                  {b}
                  <button onClick={() => removeBlock(b)} className="text-gray-500 hover:text-red-400">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <div className="flex gap-1">
                <input className="input-field flex-1 text-xs" placeholder="z.B. diamond_ore"
                  value={blockInput}
                  onChange={e => { setBlockInput(e.target.value); setShowBlockSuggestions(true); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBlock(blockInput); } }}
                  onFocus={() => setShowBlockSuggestions(true)}
                />
                <button onClick={() => addBlock(blockInput)} className="btn-secondary px-2 text-xs">
                  <Plus size={14} />
                </button>
              </div>
              {showBlockSuggestions && blockInput && (
                <div className="absolute z-10 w-full mt-1 bg-dark-700 border border-dark-500 rounded-lg overflow-hidden shadow-xl">
                  {BLOCK_SUGGESTIONS.filter(b => b.includes(blockInput.toLowerCase()) && !mineBlocks.includes(b))
                    .slice(0, 5).map(b => (
                      <button key={b} onClick={() => addBlock(b)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-dark-600 text-gray-300">
                        {b}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <p className="text-gray-600 text-xs mt-2">
              Bot abbaut diese Blöcke wenn ein Spieler in der Nähe ist (Auto-Mine muss aktiv sein)
            </p>
          </div>
          {/* Auto-Chat Config */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Clock size={14} /> Auto-Chat
            </h2>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nachricht</label>
                <input className="input-field text-xs" placeholder="z.B. Kaufe Diamonds!"
                  value={autoChatMsg} onChange={e => setAutoChatMsg(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Interval (Minuten)</label>
                <input className="input-field text-xs" type="number" min="1" max="60"
                  value={autoChatInterval} onChange={e => setAutoChatInterval(e.target.value)} />
              </div>
              <button onClick={saveAutoChat} className="btn-secondary w-full text-xs">
                Speichern
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-2">
              Sendet die Nachricht automatisch alle X Minuten (Auto-Chat muss aktiv sein)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
