import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  AtSign,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Filter,
  Guitar,
  HelpCircle,
  Inbox,
  Info,
  KeyRound,
  Mail,
  MailCheck,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { EmailEventType, EmailNotificationLog, SmtpSettings } from '../types/band.ts';
import { timeFormatOptions } from '../shared/time.ts';

export const SmtpSettingsView: React.FC = () => {
  const {
    band,
    currentUser,
    permissions,
    appSettings,
    smtpSettings,
    emailLogs,
    updateSmtpSettings,
    sendTestEmail,
    resendEmail,
    clearEmailLogs,
  } = useBand();

  const [localSettings, setLocalSettings] = useState<SmtpSettings>(smtpSettings);
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // SMTP Connection Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);

  // Test Email Probe State
  const [testRecipient, setTestRecipient] = useState(currentUser.email);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email Outbox Filter State
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | EmailEventType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'simulated' | 'failed'>('all');

  // Preview Modal State
  const [previewLog, setPreviewLog] = useState<EmailNotificationLog | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [resendingId, setResendingId] = useState<string | null>(null);

  const isAdmin = currentUser.isSuperAdmin === true;

  // Common SMTP Presets
  const SMTP_PRESETS = [
    {
      name: 'Gmail / Google Workspace',
      host: 'smtp.gmail.com',
      port: 587,
      encryption: 'tls' as const,
      authRequired: true,
      tip: 'Requires 2-Step Verification and a 16-character Google App Password (not your normal Google account password).',
    },
    {
      name: 'SendGrid',
      host: 'smtp.sendgrid.net',
      port: 587,
      encryption: 'tls' as const,
      authRequired: true,
      tip: 'Use "apikey" as Username, and your SendGrid API Key as Password.',
    },
    {
      name: 'Mailgun',
      host: 'smtp.mailgun.org',
      port: 587,
      encryption: 'tls' as const,
      authRequired: true,
      tip: 'Use your Mailgun SMTP user (e.g. postmaster@yourdomain.com) and SMTP password.',
    },
    {
      name: 'Amazon SES',
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      encryption: 'tls' as const,
      authRequired: true,
      tip: 'Use your AWS SES SMTP credentials created under Amazon SES > SMTP Settings.',
    },
    {
      name: 'Brevo (Sendinblue)',
      host: 'smtp-relay.brevo.com',
      port: 587,
      encryption: 'tls' as const,
      authRequired: true,
      tip: 'Use your Brevo login email and SMTP Master Key generated in Brevo.',
    },
    {
      name: 'Custom SMTP Server',
      host: '',
      port: 587,
      encryption: 'tls' as const,
      authRequired: true,
      tip: 'Enter your custom private email server or hosting provider SMTP credentials.',
    },
  ];

  const applyPreset = (preset: typeof SMTP_PRESETS[0]) => {
    setLocalSettings(prev => ({
      ...prev,
      host: preset.host || prev.host,
      port: preset.port,
      encryption: preset.encryption,
      authRequired: preset.authRequired,
    }));
    setVerifyResult(null);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!await updateSmtpSettings(localSettings)) return;
    setLocalSettings(previous => ({ ...previous, password: '' }));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleVerifyConnection = async () => {
    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch('/api/smtp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-RehearsalHQ-Request': '1' },
        body: JSON.stringify({
          host: localSettings.host,
          port: localSettings.port,
          encryption: localSettings.encryption,
          username: localSettings.username,
          password: localSettings.password,
          authRequired: localSettings.authRequired,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyResult({
          success: true,
          message: data.message || 'SMTP server connection verified successfully!',
        });
      } else {
        setVerifyResult({
          success: false,
          message: data.message || 'Could not connect to SMTP server. Check hostname, port, and credentials.',
        });
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        message: err.message || 'Verification request failed. Server offline or unreachable.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendTestProbe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) return;

    setIsSendingTest(true);
    setTestResult(null);

    // Save local settings first so the test uses latest input
    updateSmtpSettings(localSettings);

    const res = await sendTestEmail(testRecipient.trim());
    setIsSendingTest(false);
    setTestResult(res);
  };

  const handleResend = async (logId: string) => {
    setResendingId(logId);
    await resendEmail(logId);
    setResendingId(null);
  };

  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch =
      log.recipientName.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.recipientEmail.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.subject.toLowerCase().includes(logSearch.toLowerCase());

    const matchesFilter = logFilter === 'all' || log.eventType === logFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesFilter && matchesStatus;
  });

  const getEventBadge = (type: EmailEventType) => {
    switch (type) {
      case 'member_invite':
        return { label: 'Invitation', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'demo_archived':
        return { label: 'Archived', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case 'new_demo':
        return { label: 'New Demo', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'new_version':
        return { label: 'New Take', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'lyric_edit':
        return { label: 'Lyrics', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'practice_schedule':
        return { label: 'Rehearsal', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'practice_reminder':
        return { label: 'RSVP Reminder', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
      case 'practice_event_reminder':
        return { label: 'Event Reminder', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      case 'comment':
        return { label: 'Feedback', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
      case 'test_probe':
        return { label: 'Diagnostic', bg: 'bg-zinc-700/60 text-zinc-300 border-zinc-600' };
    }
  };

  const getStatusBadge = (status: EmailNotificationLog['status']) => {
    switch (status) {
      case 'sent':
        return { label: 'Delivered', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'simulated':
        return { label: 'Logged to Outbox', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'failed':
        return { label: 'Delivery Failed', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Quick Diagnostics Banner */}
      <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  SMTP Mail Server &amp; Notification Outbox
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase border ${
                    localSettings.isEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {localSettings.isEnabled ? 'Notifications Enabled' : 'Notifications Paused'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Configure your mail server (Gmail, SendGrid, Mailgun, Amazon SES) to automatically deliver email alerts to band members.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVerifyConnection}
              disabled={isVerifying || !localSettings.host}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isVerifying ? 'Checking...' : 'Verify SMTP Probe'}</span>
            </button>
          </div>
        </div>

        {/* Verification Alert Banner */}
        {verifyResult && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition animate-in fade-in ${
              verifyResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {verifyResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{verifyResult.success ? 'SMTP Connection Validated' : 'Connection Error'}</p>
              <p className="text-[11px] opacity-90 mt-0.5">{verifyResult.message}</p>
            </div>
            <button
              onClick={() => setVerifyResult(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Provider Presets */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Quick Provider Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {SMTP_PRESETS.map((preset) => {
              const isActive = localSettings.host === preset.host && !!preset.host;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <p className="truncate font-bold">{preset.name}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SMTP configuration */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-white text-sm">SMTP Server Connection Parameters</h4>
            </div>
            {!isAdmin && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                Super Admin Edit Only
              </span>
            )}
          </div>

          {/* Master Enable Toggle */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Enable Outbound Email Dispatcher</p>
                <p className="text-[11px] text-zinc-400">
                  When turned on, band events trigger automated emails through this SMTP connection.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.isEnabled}
                disabled={!isAdmin}
                onChange={e => setLocalSettings({ ...localSettings, isEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                SMTP Host Server *
              </label>
              <input
                type="text"
                value={localSettings.host}
                disabled={!isAdmin}
                onChange={e => setLocalSettings({ ...localSettings, host: e.target.value.trim() })}
                placeholder="e.g. smtp.gmail.com"
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white font-mono placeholder-zinc-600 disabled:opacity-60"
                required
              />
              <p className="text-[10px] text-zinc-500 mt-1">Hostname or IP of your mail relay</p>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                SMTP Port *
              </label>
              <input
                type="number"
                value={localSettings.port}
                disabled={!isAdmin}
                onChange={e => setLocalSettings({ ...localSettings, port: parseInt(e.target.value, 10) || 587 })}
                placeholder="587"
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white font-mono disabled:opacity-60"
                required
              />
              <p className="text-[10px] text-zinc-500 mt-1">587 (STARTTLS) or 465 (SSL)</p>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Encryption Protocol
              </label>
              <select
                value={localSettings.encryption}
                disabled={!isAdmin}
                onChange={e => setLocalSettings({ ...localSettings, encryption: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white disabled:opacity-60"
              >
                <option value="tls">STARTTLS / TLS (Port 587 - Recommended)</option>
                <option value="ssl">SSL / TLS (Port 465)</option>
                <option value="none">None / Plain (Port 25)</option>
              </select>
              <p className="text-[10px] text-zinc-500 mt-1">Transport Layer Security mode</p>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                SMTP Username / Email *
              </label>
              <input
                type="text"
                value={localSettings.username}
                disabled={!isAdmin}
                onChange={e => setLocalSettings({ ...localSettings, username: e.target.value.trim() })}
                placeholder="e.g. band@gmail.com"
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white font-mono placeholder-zinc-600 disabled:opacity-60"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Account username or API Key</p>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                SMTP Password / App Secret *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={localSettings.password}
                  disabled={!isAdmin}
                  onChange={e => setLocalSettings({ ...localSettings, password: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-3.5 pr-10 py-2 text-white font-mono placeholder-zinc-600 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Leave blank to keep the saved password. For Gmail, use an App Password.</p>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Sender Display Name
              </label>
              <input
                type="text"
                value={localSettings.fromName}
                disabled={!isAdmin}
                onChange={e => setLocalSettings({ ...localSettings, fromName: e.target.value })}
                placeholder={band.name}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white disabled:opacity-60"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Shown in the email "From:" field</p>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                From Email Address
              </label>
              <input
                type="email"
                value={localSettings.fromEmail}
                disabled={!isAdmin}
                onChange={e => setLocalSettings({ ...localSettings, fromEmail: e.target.value.trim() })}
                placeholder="notifications@RehearsalHQ.app"
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white font-mono placeholder-zinc-600 disabled:opacity-60"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Sender address (must match relay policy)</p>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Reply-To Email Address
              </label>
              <input
                type="email"
                value={localSettings.replyTo}
                disabled={!isAdmin}
                onChange={e => setLocalSettings({ ...localSettings, replyTo: e.target.value.trim() })}
                placeholder={currentUser.email}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white font-mono placeholder-zinc-600 disabled:opacity-60"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Where member replies are routed</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 text-xs">
          {saveSuccess && (
            <span className="flex items-center gap-1 font-medium text-emerald-400">
              <Check className="h-4 w-4" />
              <span>SMTP settings updated!</span>
            </span>
          )}
          {isAdmin && (
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 font-bold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
            >
              <Save className="h-4 w-4" />
              <span>Save SMTP Settings</span>
            </button>
          )}
        </div>
      </form>

      {/* Diagnostic Test Probe Card */}
      <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-white text-sm">Dispatch Diagnostic Test Email</h4>
          </div>
          <span className="text-xs text-zinc-400">Probe delivery to an actual mailbox</span>
        </div>

        <form onSubmit={handleSendTestProbe} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <AtSign className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="email"
              value={testRecipient}
              onChange={e => setTestRecipient(e.target.value)}
              placeholder="e.g. member@RehearsalHQ.app"
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSendingTest || !testRecipient.trim()}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-spin' : ''}`} />
            <span>{isSendingTest ? 'Dispatching Probe...' : 'Send Test Email'}</span>
          </button>
        </form>

        {testResult && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition animate-in fade-in ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{testResult.success ? 'Probe Dispatched' : 'Probe Failed'}</p>
              <p className="text-[11px] opacity-90 mt-0.5">{testResult.message}</p>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Live Email Notification Outbox & Delivery History */}
      <div className="rounded-3xl bg-zinc-900/70 border border-zinc-800 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="font-bold text-white text-base">
                Notification Outbox &amp; Delivery Log ({emailLogs.length})
              </h4>
              <p className="text-xs text-zinc-400">
                Audit trail of all emails sent or queued to band members with full HTML previews.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {emailLogs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all notification email logs?')) {
                    clearEmailLogs();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 text-xs font-semibold border border-zinc-700 transition"
              >
                Clear Outbox
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by recipient, email, subject..."
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <select
              value={logFilter}
              onChange={e => setLogFilter(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300 text-xs"
            >
              <option value="all">All Events</option>
              <option value="member_invite">Member Invitations</option>
              <option value="demo_archived">Archived Demos</option>
              <option value="new_demo">New Demos</option>
              <option value="new_version">New Takes</option>
              <option value="lyric_edit">Lyrics Edits</option>
              <option value="practice_schedule">Practices</option>
              <option value="practice_reminder">RSVP Reminders</option>
              <option value="practice_event_reminder">Event Reminders</option>
              <option value="comment">Comments</option>
              <option value="test_probe">Diagnostic Tests</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Delivered</option>
              <option value="simulated">Simulated / Outbox</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs space-y-2">
              <Mail className="w-8 h-8 mx-auto text-zinc-600 opacity-60" />
              <p>No notification logs match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3.5">Recipient</th>
                    <th className="py-2.5 px-3">Event</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Sent At</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {filteredLogs.map(log => {
                    const eventBadge = getEventBadge(log.eventType);
                    const statusBadge = getStatusBadge(log.status);

                    return (
                      <tr key={log.id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-2.5 px-3.5">
                          <div>
                            <p className="font-bold text-white">{log.recipientName}</p>
                            <p className="text-[11px] text-zinc-500 font-mono">{log.recipientEmail}</p>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase border font-semibold ${eventBadge.bg}`}>
                            {eventBadge.label}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 max-w-xs truncate font-medium text-zinc-200" title={log.subject}>
                          {log.subject}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase border font-semibold ${statusBadge.bg}`}>
                            {statusBadge.label}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.sentAt).toLocaleDateString()} {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', ...timeFormatOptions(appSettings.timeFormat) })}
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewLog(log)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Preview rendered HTML email"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResend(log.id)}
                              disabled={resendingId === log.id}
                              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                              title="Resend this notification"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${resendingId === log.id ? 'animate-spin text-amber-400' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HTML Email Preview Modal */}
      {/* ========================================================================= */}
      {previewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Rendered Email Notification Preview</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">Dispatched to {previewLog.recipientEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Device Switcher */}
                <div className="flex items-center p-1 bg-zinc-800 rounded-lg text-xs">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2.5 py-1 rounded font-semibold transition ${
                      previewDevice === 'desktop' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2.5 py-1 rounded font-semibold transition ${
                      previewDevice === 'mobile' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Mobile
                  </button>
                </div>

                <button
                  onClick={() => setPreviewLog(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Email Meta Bar */}
            <div className="px-6 py-3 bg-zinc-950/80 border-b border-zinc-800 text-xs space-y-1 font-mono text-zinc-400">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-zinc-500">From:</span> "{localSettings.fromName || band.name}" &lt;{localSettings.fromEmail || 'notifications@RehearsalHQ.app'}&gt;
                </div>
                <span className="text-[10px] text-zinc-500">
                  {new Date(previewLog.sentAt).toLocaleString(undefined, timeFormatOptions(appSettings.timeFormat))}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">To:</span> {previewLog.recipientName} &lt;{previewLog.recipientEmail}&gt;
              </div>
              <div>
                <span className="text-zinc-500">Subject:</span> <strong className="text-white font-sans">{previewLog.subject}</strong>
              </div>
            </div>

            {/* Rendered HTML Container */}
            <div className="p-6 overflow-y-auto bg-zinc-950 flex justify-center">
              <div
                className={`w-full transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'max-w-sm border border-zinc-700/80 rounded-2xl p-2 shadow-2xl bg-zinc-900' : 'max-w-2xl'
                }`}
              >
                <div
                  className="rounded-xl overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: previewLog.htmlContent }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-mono text-[11px]">
                Relay: {previewLog.smtpHostUsed}
              </span>
              <button
                type="button"
                onClick={() => setPreviewLog(null)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
