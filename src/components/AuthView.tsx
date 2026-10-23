import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { RehearsalHQLogo } from './RehearsalHQLogo.tsx';
import { useBand } from '../context/BandContext.tsx';
import { LegalNoticesModal } from './LegalNoticesModal.tsx';

const REPOSITORY_URL = 'https://github.com/dcoffin88/RehearsalHQ';
const QRCodeSVG = React.lazy(() =>
  import('qrcode.react').then((module) => ({ default: module.QRCodeSVG })),
);

interface TwoFactorChallenge {
  challengeToken: string;
  setupRequired: boolean;
  manualKey?: string;
  otpauthUrl?: string;
  recoveryCodes?: string[];
}

export const AuthView: React.FC = () => {
  const { login, verifyTwoFactor, forgotPassword, resetPassword, setupAccount, passwordResetEnabled } = useBand();
  const initialResetToken = new URLSearchParams(window.location.search).get('resetToken') || '';
  const initialInviteToken = new URLSearchParams(window.location.search).get('inviteToken') || '';
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset' | 'setup'>(
    initialInviteToken ? 'setup' : initialResetToken ? 'reset' : 'login',
  );
  const [actionToken] = useState(initialInviteToken || initialResetToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLegalNoticesOpen, setIsLegalNoticesOpen] = useState(false);
  const [twoFactor, setTwoFactor] = useState<TwoFactorChallenge | null>(null);
  const [authenticationCode, setAuthenticationCode] = useState('');
  const [recoveryCodesSaved, setRecoveryCodesSaved] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'forgot') {
      const result = await forgotPassword(email);
      if (result.success) setMessage(result.message || 'Check your email for a reset link.');
      else setError(result.message || 'Unable to request a password reset.');
      setLoading(false);
      return;
    }
    if (mode === 'reset' || mode === 'setup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      const result = mode === 'setup'
        ? await setupAccount(actionToken, password)
        : await resetPassword(actionToken, password);
      if (result.success) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setPassword('');
        setConfirmPassword('');
        setMode('login');
        setMessage(result.message || (mode === 'setup' ? 'Your account is ready.' : 'Your password has been reset.'));
      } else setError(result.message || (mode === 'setup' ? 'Unable to set up account.' : 'Unable to reset password.'));
      setLoading(false);
      return;
    }

    const result = twoFactor
      ? await verifyTwoFactor(twoFactor.challengeToken, authenticationCode, rememberDevice)
      : await login(email, password);
    if (result.twoFactorRequired && result.challengeToken) {
      setTwoFactor({
        challengeToken: result.challengeToken,
        setupRequired: Boolean(result.setupRequired),
        manualKey: result.manualKey,
        otpauthUrl: result.otpauthUrl,
        recoveryCodes: result.recoveryCodes,
      });
      setAuthenticationCode('');
      setLoading(false);
      return;
    }
    if (!result.success) setError(result.message || 'Sign in failed.');
    setLoading(false);
  };

  const returnToPassword = () => {
    setTwoFactor(null);
    setAuthenticationCode('');
    setRecoveryCodesSaved(false);
    setRememberDevice(false);
    setError('');
  };

  const returnToLogin = () => {
    setMode('login');
    setError('');
    setMessage('');
  };

  const buttonLabel = loading
    ? mode === 'forgot' ? 'Sending…' : mode === 'setup' ? 'Setting Up…' : mode === 'reset' ? 'Resetting…' : 'Verifying…'
    : twoFactor ? 'Verify & Sign In' : mode === 'forgot' ? 'Send Reset Link' : mode === 'setup' ? 'Set Password' : mode === 'reset' ? 'Reset Password' : 'Sign In';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center justify-center gap-3">
              <RehearsalHQLogo className="w-12 h-12 shrink-0 text-amber-400" />
              <h1 className="text-3xl font-black tracking-tight text-white">RehearsalHQ</h1>
            </div>
            <p className="text-sm font-medium text-zinc-300">Your band's home base</p>
            <p className="text-xs text-zinc-500">Recordings · Lyrics · Rehearsals · Collaboration</p>
          </div>
        </div>

        <form onSubmit={submit} className="p-7 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-5">
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-rose-500/15 text-rose-300 text-sm flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          {message && <div role="status" className="rounded-xl bg-emerald-500/15 p-3 text-sm text-emerald-300">{message}</div>}

          {!twoFactor && mode === 'login' ? (
            <>
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold mb-2">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <input id="login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold mb-2">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-10 py-2 text-white" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-3 text-zinc-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordResetEnabled && (
                  <button type="button" onClick={() => { setMode('forgot'); setError(''); setMessage(''); }} className="mt-2 text-xs font-semibold text-amber-400 transition hover:text-amber-300">Forgot password?</button>
                )}
              </div>
            </>
          ) : twoFactor ? (
            <>
              <div className="space-y-3 text-center">
                <ShieldCheck className="mx-auto h-9 w-9 text-amber-400" />
                <div>
                  <h2 className="font-bold text-white">{twoFactor.setupRequired ? 'Set up two-factor authentication' : 'Two-factor verification'}</h2>
                  <p className="mt-1 text-xs text-zinc-400">{twoFactor.setupRequired ? 'Scan this QR code with your authenticator app, then enter its six-digit code.' : 'Enter the six-digit code from your authenticator app or use a recovery code.'}</p>
                </div>
              </div>
              {twoFactor.setupRequired && twoFactor.otpauthUrl && (
                <div className="space-y-3">
                  <div className="mx-auto w-fit rounded-2xl bg-white p-3">
                    <React.Suspense fallback={<div className="h-44 w-44 animate-pulse bg-zinc-200" />}><QRCodeSVG value={twoFactor.otpauthUrl} size={176} level="M" /></React.Suspense>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs">
                    <p className="text-zinc-500">Manual setup key</p>
                    <p className="mt-1 break-all font-mono font-semibold tracking-wider text-zinc-200">{twoFactor.manualKey}</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs">
                    <p className="font-semibold text-amber-200">Save these one-time recovery codes</p>
                    <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-zinc-200">{twoFactor.recoveryCodes?.map((code) => <span key={code}>{code}</span>)}</div>
                    <label className="mt-3 flex items-start gap-2 text-zinc-300">
                      <input type="checkbox" checked={recoveryCodesSaved} onChange={(event) => setRecoveryCodesSaved(event.target.checked)} className="mt-0.5 accent-amber-500" />
                      <span>I saved these recovery codes in a secure place.</span>
                    </label>
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="login-two-factor" className="block text-xs font-semibold mb-2">Authentication or recovery code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input id="login-two-factor" type="text" autoComplete="one-time-code" autoFocus required minLength={6} maxLength={20} value={authenticationCode} onChange={(event) => setAuthenticationCode(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 font-mono tracking-widest text-white" />
                </div>
              </div>
              <label className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-300">
                <input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
                <span>Remember this device for 30 days</span>
              </label>
            </>
          ) : mode === 'forgot' ? (
            <>
              <div className="space-y-2 text-center">
                <KeyRound className="mx-auto h-9 w-9 text-amber-400" />
                <h2 className="font-bold text-white">Reset your password</h2>
                <p className="text-xs text-zinc-400">Enter your account email and we’ll send you a secure reset link.</p>
              </div>
              <div>
                <label htmlFor="reset-email" className="mb-2 block text-xs font-semibold">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input id="reset-email" type="email" autoComplete="email" autoFocus required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 text-white" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 text-center">
                <KeyRound className="mx-auto h-9 w-9 text-amber-400" />
                <h2 className="font-bold text-white">{mode === 'setup' ? 'Set up your account' : 'Choose a new password'}</h2>
                <p className="text-xs text-zinc-400">{mode === 'setup' ? 'Choose and confirm the password you’ll use to sign in.' : 'Enter and confirm your new account password.'}</p>
              </div>
              <div>
                <label htmlFor="new-password" className="mb-2 block text-xs font-semibold">New password</label>
                <input id="new-password" type="password" autoComplete="new-password" autoFocus required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-xs font-semibold">Confirm new password</label>
                <input id="confirm-password" type="password" autoComplete="new-password" required maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white" />
              </div>
            </>
          )}

          <button disabled={loading || Boolean(twoFactor?.setupRequired && !recoveryCodesSaved)} className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold disabled:opacity-50">{buttonLabel}</button>

          {twoFactor ? (
            <button type="button" onClick={returnToPassword} className="flex w-full items-center justify-center gap-1.5 text-xs text-zinc-400 transition hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Back to password</button>
          ) : mode !== 'login' ? (
            <button type="button" onClick={returnToLogin} className="flex w-full items-center justify-center gap-1.5 text-xs text-zinc-400 transition hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Back to sign in</button>
          ) : (
            <p className="text-xs text-zinc-400">Need an account{passwordResetEnabled ? '?' : ' or a password reset?'} Contact your Band Admin.</p>
          )}
        </form>

        <p className="text-center text-xs text-zinc-500">
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-amber-400">Powered by RehearsalHQ</a>
          <span aria-hidden="true"> · </span>
          <button type="button" onClick={() => setIsLegalNoticesOpen(true)} className="transition hover:text-amber-400">Legal notices</button>
        </p>
      </div>
      <LegalNoticesModal isOpen={isLegalNoticesOpen} onClose={() => setIsLegalNoticesOpen(false)} />
    </div>
  );
};
