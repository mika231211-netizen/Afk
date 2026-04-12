import React, { useState } from 'react';
import { X, Microsoft } from 'lucide-react';
import api from '../api/axios';

const COMMON_BLOCKS = [
  'diamond_ore', 'deepslate_diamond_ore',
  'iron_ore', 'deepslate_iron_ore',
  'gold_ore', 'deepslate_gold_ore',
  'coal_ore', 'deepslate_coal_ore',
  'emerald_ore', 'ancient_debris',
  'oak_log', 'spruce_log', 'birch_log',
];

export default function AddServerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', host: '', port: '25565',
    botUsername: '', useMicrosoftAuth: false, microsoftEmail: '',
    version: '1.20.1', autoReconnect: true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/servers', { ...form, port: Number(form.port) });
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="card w-full max-w-lg my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Server hinzufügen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Name</label>
            <input className="input-field" placeholder="Mein Server" value={form.name}
              onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-1 block">Server IP</label>
              <input className="input-field" placeholder="play.example.com" value={form.host}
                onChange={e => set('host', e.target.value)} required />
            </div>
            <div className="w-24">
              <label className="text-sm text-gray-400 mb-1 block">Port</label>
              <input className="input-field" type="number" value={form.port}
                onChange={e => set('port', e.target.value)} />
            </div>
          </div>

          {/* Auth Mode */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Authentifizierung</label>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => set('useMicrosoftAuth', false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${!form.useMicrosoftAuth ? 'bg-accent-500 border-accent-500 text-white' : 'bg-dark-700 border-dark-500 text-gray-400'}`}>
                Offline / Cracked
              </button>
              <button type="button"
                onClick={() => set('useMicrosoftAuth', true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.useMicrosoftAuth ? 'bg-accent-500 border-accent-500 text-white' : 'bg-dark-700 border-dark-500 text-gray-400'}`}>
                🪟 Microsoft (Premium)
              </button>
            </div>
          </div>

          {form.useMicrosoftAuth ? (
            <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-3 text-sm text-blue-300">
              <p className="font-medium mb-1">🔐 Microsoft Auth</p>
              <p className="text-xs text-blue-400">Beim ersten Start erscheint ein Device-Code im Chat-Log. Öffne den Link und gib den Code ein, um dich mit deinem Microsoft-Konto anzumelden.</p>
            </div>
          ) : (
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Bot-Benutzername</label>
              <input className="input-field" placeholder="CoolBot123" value={form.botUsername}
                onChange={e => set('botUsername', e.target.value)} required={!form.useMicrosoftAuth} />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Minecraft Version</label>
            <input className="input-field" placeholder="1.20.1" value={form.version}
              onChange={e => set('version', e.target.value)} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.autoReconnect}
              onChange={e => set('autoReconnect', e.target.checked)} className="accent-accent-500" />
            <span className="text-sm text-gray-300">Auto-Reconnect aktivieren</span>
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Erstelle...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
