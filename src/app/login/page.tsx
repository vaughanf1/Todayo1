'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Read the post-login destination off the URL without pulling in
        // useSearchParams (which would force a Suspense boundary).
        const next = new URLSearchParams(window.location.search).get('next');
        router.replace(next && next.startsWith('/') ? next : '/');
        router.refresh();
      } else {
        setError(true);
        setPassword('');
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm glass rounded-3xl p-8 shadow-xl flex flex-col items-center gap-6"
      >
        <div className="w-12 h-12 rounded-2xl bg-card border border-border/40 flex items-center justify-center shadow-sm">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Todayo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the password to continue
          </p>
        </div>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          className={`w-full px-4 py-3 rounded-xl bg-card border text-foreground placeholder:text-muted-foreground outline-none transition-colors ${
            error ? 'border-red-500' : 'border-border/40 focus:border-[#0A84FF]'
          }`}
        />

        {error && (
          <p className="text-sm text-red-500 -mt-3">Incorrect password</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-3 rounded-xl bg-[#0A84FF] text-white font-medium shadow-sm disabled:opacity-50 hover:bg-[#0a78e6] transition-colors"
        >
          {loading ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </main>
  );
}
