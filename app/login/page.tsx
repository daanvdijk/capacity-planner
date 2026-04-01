'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? 'Login failed');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm">⚡</div>
          <span className="text-lg font-semibold">Team Capacity</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-6 flex flex-col gap-4">
          <h1 className="text-sm font-medium text-center text-muted-foreground mb-1">Sign in to continue</h1>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-foreground">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-foreground">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-9 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-60 mt-1"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
