import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🎮</span>
          <h1 className="text-2xl font-bold mt-3">Minecraft Panel</h1>
          <p className="text-gray-400 text-sm mt-1">Melde dich an, um fortzufahren</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">E-Mail</label>
              <input className="input-field" type="email" placeholder="deine@email.de"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Passwort</label>
              <input className="input-field" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-4">
            Noch kein Konto?{' '}
            <Link to="/register" className="text-accent-400 hover:underline">Registrieren</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
