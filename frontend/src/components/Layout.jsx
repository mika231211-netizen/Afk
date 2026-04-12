import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { LayoutDashboard, LogOut, Wifi, WifiOff } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Navbar */}
      <header className="bg-dark-800 border-b border-dark-600 px-6 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 text-white font-bold text-lg">
          <span className="text-2xl">🎮</span>
          <span>Minecraft Panel</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1.5 text-sm ${connected ? 'text-success' : 'text-gray-500'}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'Live' : 'Offline'}
          </span>
          <span className="text-gray-400 text-sm">{user?.username}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
