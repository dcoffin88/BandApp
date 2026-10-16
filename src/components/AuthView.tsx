import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Guitar,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Music,
  Shield,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { Role } from '../types/band.ts';

export const AuthView: React.FC = () => {
  const { band, login, registerUser, quickLoginAs } = useBand();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Register fields
  const [name, setName] = useState('');
  const [stageName, setStageName] = useState('');
  const [instrument, setInstrument] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('member');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      const res = login(email, password);
      if (!res.success) {
        setErrorMsg(res.message || 'Login failed.');
        setIsLoading(false);
      }
    }, 400);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in your name, email, and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      const res = registerUser({
        name: name.trim(),
        stageName: stageName.trim() || name.trim(),
        email: email.trim(),
        password,
        role: selectedRole,
        instrument: instrument.trim() || 'Vocals / Guitar',
        avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 800)}?w=150&auto=format&fit=crop&q=80`,
      });

      if (!res.success) {
        setErrorMsg(res.message || 'Registration failed.');
        setIsLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Band Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 shadow-xl shadow-amber-500/20 text-zinc-950 mb-2">
            <Guitar className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {band.name}
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Band collaboration hub for demos, multi-take versioning, lyric drafting, and rehearsals.
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-2xl space-y-5">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg('');
              }}
              className={`py-2 rounded-lg transition ${
                mode === 'signin'
                  ? 'bg-zinc-800 text-amber-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`py-2 rounded-lg transition ${
                mode === 'register'
                  ? 'bg-zinc-800 text-amber-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Join Band
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Band Member Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="e.g. dave@bandjam.app"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-zinc-300 uppercase tracking-wider">
                    Password
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    (Default: password123)
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-9 pr-10 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Signing In...' : 'Sign In to Band Portal'}</span>
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jordan Blake"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Stage Name / Handle
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JB Shreads"
                    value={stageName}
                    onChange={e => setStageName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Instrument
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Guitar / Vocals"
                    value={instrument}
                    onChange={e => setInstrument(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="jordan@bandjam.app"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Create Password *
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Requested Role
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as Role)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="member">Band Member (Upload takes, edit lyrics)</option>
                  <option value="songwriter">Songwriter (Write demos, lyrics, schedule)</option>
                  <option value="guest">Session / Guest (Listen, download, RSVP)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'Creating Account...' : 'Create Account & Join'}</span>
              </button>
            </form>
          )}

          {/* Quick Demo Sign In Section */}
          <div className="pt-4 border-t border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="font-semibold uppercase tracking-wider">Fast 1-Click Demo Login</span>
              <span>Test Role Permissions</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-left">
              {band.members.slice(0, 4).map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => quickLoginAs(member.id)}
                  className="p-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 text-left transition flex items-center gap-2 group"
                >
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-zinc-700"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-[11px] truncate group-hover:text-amber-400">
                      {member.name.split(' ')[0]}
                    </p>
                    <p className="text-[9px] text-zinc-400 uppercase font-mono truncate">
                      {member.role}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Role-Based Access Control • Active Session Guard</span>
        </div>
      </div>
    </div>
  );
};
