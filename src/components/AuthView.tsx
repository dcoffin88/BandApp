import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { RehearsalHQLogo } from './RehearsalHQLogo.tsx';
import { useBand } from '../context/BandContext.tsx';

export const AuthView: React.FC = () => {
  const { band, login, appSettings } = useBand();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message || 'Sign in failed.');
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center justify-center gap-3">
              <RehearsalHQLogo
                className="w-12 h-12 shrink-0 text-amber-400"
              />
              <h1 className="text-3xl font-black tracking-tight text-white">
                RehearsalHQ
              </h1>
            </div>

            <p className="text-sm font-medium text-zinc-300">
              Your band's home base.
            </p>

            <p className="text-xs text-zinc-500">
              Recordings · Lyrics · Rehearsals · Collaboration
            </p>
          </div>
        </div>
        <form
          onSubmit={submit}
          className="p-7 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-5"
        >
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-500/15 text-rose-300 text-sm flex gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold mb-2"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-10 py-2 text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-3 text-zinc-400"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <button
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <p className="text-xs text-zinc-400">
            Need an account or a password reset? Contact your Band Admin.
          </p>
        </form>
      </div>
    </div>
  );
};
