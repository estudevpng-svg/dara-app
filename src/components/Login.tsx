import React, { useState } from 'react';
import { BarChart3, Lock, Mail, Loader2 } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        onLogin(data);
      } else {
        setError('Email atau password salah.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-green dark:bg-slate-950 px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-brand-orange/20 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-brand-orange/20 blur-3xl"></div>
      
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-slate-900/80 p-10 shadow-2xl relative z-10 border-t-4 border-brand-orange backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
            <BarChart3 size={32} />
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-brand-green dark:text-emerald-400 font-display">
            DARA Login
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Dinas Pertanian, Ketahanan Pangan dan Perikanan Kabupaten Ponorogo
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="email"
                required
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 pl-10 pr-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-orange focus:outline-none focus:ring-brand-orange sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="password"
                required
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 pl-10 pr-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-orange focus:outline-none focus:ring-brand-orange sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-brand-green px-4 py-3 text-sm font-bold text-white transition-all hover:bg-brand-green/90 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 disabled:opacity-50 border-b-2 border-brand-orange active:translate-y-0.5"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
