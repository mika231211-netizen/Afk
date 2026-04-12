import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Server, Trash2, Play, Square } from 'lucide-react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import AddServerModal from '../components/AddServerModal';
import { useSocket } from '../context/SocketContext';

export default function DashboardPage() {
  const [servers, setServers] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { on, off } = useSocket();

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    const handler = (data) => {
      setStatuses(prev => ({ ...prev, [data.serverId]: data.state }));
    };
    on('bot:status', handler);
    return () => off('bot:status', handler);
  }, [on, off]);

  const fetchServers = async () => {
    try {
      const res = await api.get('/servers');
      setServers(res.data);
      // Fetch statuses
      const statusMap = {};
      await Promise.all(res.data.map(async (s) => {
        const r = await api.get(`/bot/status/${s._id}`);
        statusMap[s._id] = r.data.state;
      }));
      setStatuses(statusMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Server wirklich löschen?')) return;
    await api.delete(`/servers/${id}`);
    setServers(prev => prev.filter(s => s._id !== id));
  };

  const handleStart = async (id) => {
    await api.post(`/bot/start/${id}`);
    setStatuses(prev => ({ ...prev, [id]: 'connecting' }));
  };

  const handleStop = async (id) => {
    await api.post(`/bot/stop/${id}`);
    setStatuses(prev => ({ ...prev, [id]: 'stopped' }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Verwalte deine Minecraft-Bots</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Server hinzufügen
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Lade Server...</div>
      ) : servers.length === 0 ? (
        <div className="card text-center py-16">
          <Server size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Noch keine Server. Füge deinen ersten hinzu!</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Server hinzufügen
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map(server => {
            const state = statuses[server._id] || 'stopped';
            const isRunning = ['online', 'connecting', 'reconnecting'].includes(state);
            return (
              <div key={server._id} className="card flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{server.name}</h3>
                    <p className="text-gray-400 text-sm">{server.host}:{server.port}</p>
                    <p className="text-gray-500 text-xs mt-0.5">Bot: {server.botUsername}</p>
                  </div>
                  <StatusBadge state={state} />
                </div>
                <div className="flex gap-2 mt-auto">
                  <Link to={`/server/${server._id}`} className="btn-secondary flex-1 text-center text-sm">
                    Details
                  </Link>
                  {isRunning ? (
                    <button onClick={() => handleStop(server._id)} className="btn-danger flex items-center gap-1 text-sm px-3">
                      <Square size={14} /> Stop
                    </button>
                  ) : (
                    <button onClick={() => handleStart(server._id)} className="btn-primary flex items-center gap-1 text-sm px-3">
                      <Play size={14} /> Start
                    </button>
                  )}
                  <button onClick={() => handleDelete(server._id)} className="text-gray-500 hover:text-red-400 transition-colors px-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddServerModal
          onClose={() => setShowModal(false)}
          onCreated={(s) => setServers(prev => [...prev, s])}
        />
      )}
    </div>
  );
}
