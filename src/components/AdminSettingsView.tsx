import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  Crop,
  Crown,
  Database,
  Edit2,
  Eye,
  EyeOff,
  Github,
  Guitar,
  Image as ImageIcon,
  Info,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { AppSettings, AuthSettings, BandMember, Role, UserStatus, MemberInvitationResult } from '../types/band.ts';
import { ImageCropModal } from './ImageCropModal.tsx';
import { SmtpSettingsView } from './SmtpSettingsView.tsx';
import { DEFAULT_AVATAR } from '../shared/defaults.ts';
import { useAppVersion } from '../hooks/useAppVersion.ts';
import { VersionModal } from './VersionModal.tsx';

interface AdminSettingsViewProps {
  initialTab?: 'users' | 'auth' | 'app' | 'smtp';
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  initialTab = 'app',
}) => {
  const {
    band,
    currentUser,
    permissions,
    authSettings,
    auditLogs,
    appSettings,
    updateBandName,
    updateUserRole,
    updateUserStatus,
    updateUserProfile,
    deleteUserAccount,
    updateAuthSettings,
    updateAppSettings,
    clearAuditLogs,
    addBandMember,
    sendMemberInvite,
    logout,
  } = useBand();

  const {
    versionInfo,
    isLoading: isCheckingVersion,
    checkUpdates,
    isModalOpen: isVersionModalOpen,
    setIsModalOpen: setIsVersionModalOpen,
  } = useAppVersion();

  const [selectedSubTab, setActiveSubTab] = useState<'users' | 'auth' | 'app' | 'smtp'>(initialTab);

  // Band Edit State
  const [bandName, setBandName] = useState(band.name);
  const [bandMotto, setBandMotto] = useState(band.motto);
  const [bandGenre, setBandGenre] = useState(band.genre);
  const [bandYear, setBandYear] = useState(band.foundedYear);
  const [bandSaveSuccess, setBandSaveSuccess] = useState(false);

  // App Settings & Header Logo State
  const [localAppSettings, setLocalAppSettings] = useState<AppSettings>(appSettings);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [appSettingsSaveSuccess, setAppSettingsSaveSuccess] = useState(false);

  // User Management State
  const [userSearch, setUserSearch] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('member');
  const [newUserInstrument, setNewUserInstrument] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [invitationFeedback, setInvitationFeedback] = useState<MemberInvitationResult | null>(null);

  // Password reset modal state
  const [resettingUser, setResettingUser] = useState<BandMember | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  // Auth Settings Form State
  const [localAuthSettings, setLocalAuthSettings] = useState<AuthSettings>(authSettings);
  const [authSaveSuccess, setAuthSaveSuccess] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const activeSubTab = selectedSubTab;

  // Handlers
  const handleSaveBandSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageMembers) return;
    if (!await updateBandName(bandName, bandMotto, bandGenre, bandYear)) return;
    setBandSaveSuccess(true);
    setTimeout(() => setBandSaveSuccess(false), 2500);
  };

  const handleSaveAppSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const { headerLogoUrl, headerLogoShape, headerSubtitle } = localAppSettings;
    if (!await updateAppSettings({ headerLogoUrl, headerLogoShape, headerSubtitle })) return;
    setAppSettingsSaveSuccess(true);
    setTimeout(() => setAppSettingsSaveSuccess(false), 2500);
  };

  const handleSaveAuthSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageMembers) return;
    if (!await updateAuthSettings(localAuthSettings)) return;
    setAuthSaveSuccess(true);
    setTimeout(() => setAuthSaveSuccess(false), 2500);
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingMember || !newUserName.trim() || !newUserEmail.trim()) return;
    setIsAddingMember(true);
    setInvitationFeedback(null);

    const saved = await addBandMember({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      status: 'active',
      instrument: newUserInstrument.trim() || 'Vocals / Guitar',
      password: newUserPassword,
      avatar: DEFAULT_AVATAR,
    });

    setIsAddingMember(false);
    if (!saved.success) return;
    if (saved.invitation) setInvitationFeedback({ ...saved.invitation, message: `Member added. ${saved.invitation.message}` });
    setIsInviteModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserInstrument('');
    setNewUserPassword('');
  };

  const handleResendInvite = async (member: BandMember) => {
    if (invitingUserId) return;
    setInvitingUserId(member.id);
    setInvitationFeedback(null);
    const result = await sendMemberInvite(member.id);
    setInvitationFeedback(result);
    setInvitingUserId(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newResetPassword.trim()) return;
    if (!await updateUserProfile(resettingUser.id, { password: newResetPassword })) return;
    setResettingUser(null);
    setNewResetPassword('');
  };

  const filteredMembers = band.members.filter(m =>
    m.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    m.instrument.toLowerCase().includes(userSearch.toLowerCase()) ||
    m.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Admin Settings
              </h2>
              <p className="text-xs text-zinc-400">
                Manage band identity, header branding, members, authentication, and email settings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 border border-zinc-700 text-xs font-semibold transition"
            title="Log out of current session"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 p-1 bg-zinc-900/90 rounded-2xl border border-zinc-800 overflow-x-auto text-xs font-semibold">
        {isAdmin && <>
        <button
          onClick={() => setActiveSubTab('app')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeSubTab === 'app'
              ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>App Settings</span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeSubTab === 'users'
              ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management ({band.members.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('auth')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeSubTab === 'auth'
              ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Authentication Management</span>
        </button>
        </>}

        {isAdmin && <button onClick={() => setActiveSubTab('smtp')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${activeSubTab === 'smtp' ? 'bg-amber-500 text-zinc-950 shadow-md font-bold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}><Mail className="w-4 h-4"/><span>Email Settings</span></button>}
      </div>

      {isAdmin && activeSubTab === 'smtp' && <SmtpSettingsView />}

      {/* ========================================================================= */}
      {/* APP SETTINGS (BAND IDENTITY & HEADER LOGO / NAME AREA EDITOR) */}
      {/* ========================================================================= */}
      {isAdmin && activeSubTab === 'app' && (
        <div className="space-y-6">
          {/* Band Profile Editor Form */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Guitar className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Band Identity &amp; Metadata</h3>
              </div>
              {!isAdmin && (
                <span className="text-xs px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 font-mono">
                  Admin Edit Only
                </span>
              )}
            </div>

            <form onSubmit={handleSaveBandSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Band Name *
                  </label>
                  <input
                    type="text"
                    value={bandName}
                    disabled={!isAdmin}
                    onChange={e => setBandName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm disabled:opacity-60"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Musical Genre
                  </label>
                  <input
                    type="text"
                    value={bandGenre}
                    disabled={!isAdmin}
                    onChange={e => setBandGenre(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Motto / Tagline
                  </label>
                  <input
                    type="text"
                    value={bandMotto}
                    disabled={!isAdmin}
                    onChange={e => setBandMotto(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Founded Year
                  </label>
                  <input
                    type="text"
                    value={bandYear}
                    disabled={!isAdmin}
                    onChange={e => setBandYear(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm font-mono disabled:opacity-60"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2 flex items-center justify-end gap-3">
                  {bandSaveSuccess && (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      <span>Band details updated!</span>
                    </span>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition flex items-center gap-1.5 shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Band Details</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Header Logo & Name Area Live Mockup */}
          {isAdmin && (
          <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Header Logo &amp; Name Area Editor</h3>
              </div>
            </div>

            {/* Live Header Preview Box */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {localAppSettings.headerLogoUrl ? (
                  <img
                    src={localAppSettings.headerLogoUrl}
                    alt="Band Logo"
                    className={`w-12 h-12 object-cover ring-2 ring-amber-500/50 shadow-lg ${
                      localAppSettings.headerLogoShape === 'circle'
                        ? 'rounded-full'
                        : localAppSettings.headerLogoShape === 'square'
                        ? 'rounded-lg'
                        : 'rounded-2xl'
                    }`}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-zinc-950 font-black">
                    <Guitar className="w-6 h-6 text-zinc-950" />
                  </div>
                )}

                <div className="min-w-0">
                  <h4 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                    {band.name}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate">
                    {localAppSettings.headerSubtitle || band.motto}
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold border border-amber-500/40">
                  Live Preview
                </span>
              </div>
            </div>

            {/* Logo Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Band Logo Image
                </label>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCropModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition"
                  >
                    <Crop className="w-4 h-4 stroke-[2.5]" />
                    <span>Upload &amp; Crop Logo Image</span>
                  </button>

                  {localAppSettings.headerLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setLocalAppSettings({ ...localAppSettings, headerLogoUrl: '' })}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold transition"
                      title="Revert to guitar icon"
                    >
                      Reset to Icon
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Upload logo or photo. The crop tool lets you zoom, pan, rotate, and crop.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Logo Shape in Navbar
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'rounded', label: 'Squircle' },
                    { id: 'circle', label: 'Circle' },
                    { id: 'square', label: 'Square' },
                  ].map(shape => (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => setLocalAppSettings({ ...localAppSettings, headerLogoShape: shape.id as any })}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition ${
                        localAppSettings.headerLogoShape === shape.id
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Header Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    value={localAppSettings.headerSubtitle}
                    onChange={e => setLocalAppSettings({ ...localAppSettings, headerSubtitle: e.target.value })}
                    placeholder="e.g. Band Collaboration Vault"
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-white text-xs"
                  />
                </div>
              </div>
            </div>
            {/* Save Button */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3 text-xs">
              {appSettingsSaveSuccess && (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Header saved!</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveAppSettings}
                disabled={!isAdmin}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>Save Header</span>
              </button>
            </div>
          </div>

          )}

          {/* Application Version & GitHub Release Tracking */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Github className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Application Version &amp; Release Tracking</h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 uppercase tracking-wider font-semibold text-[10px]">
                  Installed Version
                </span>
                <div className="font-mono text-lg font-bold text-white">
                  v{versionInfo.currentVersion}
                </div>
                <p className="text-zinc-400 text-[11px]">Current active deployment</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 uppercase tracking-wider font-semibold text-[10px]">
                  Latest GitHub Release
                </span>
                <div className={`font-mono text-lg font-bold flex items-center gap-2 ${
                  versionInfo.updateAvailable ? 'text-amber-500' : 'text-emerald-400'
                }`}>
                  <span>{versionInfo.latestTag || `v${versionInfo.latestVersion}`}</span>
                  {versionInfo.updateAvailable && (
                    <span className="text-[10px] font-sans font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                      Update Available
                    </span>
                  )}
                </div>
                <p className="text-zinc-400 text-[11px]">
                  {versionInfo.updateAvailable
                    ? 'Newer release is published on GitHub'
                    : 'Up to date with GitHub releases'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider font-semibold text-[10px]">
                    Release Source
                  </span>
                  <div className="font-semibold text-zinc-200 truncate mt-0.5">
                    dcoffin88 / BandApp
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href="https://github.com/dcoffin88/BandApp/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition text-[11px]"
                  >
                    View Release
                  </a>
                  <button
                    type="button"
                    onClick={() => checkUpdates(true)}
                    disabled={isCheckingVersion}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition disabled:opacity-50"
                    title="Check for updates now"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingVersion ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. USER MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {isAdmin && activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* Top Actions: Search & Invite */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative sm:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, email, instrument..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition shadow-md self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add / Invite User</span>
              </button>
            )}
          </div>

          {/* User Directory Table */}
          {invitationFeedback && (
            <div role="status" className={`rounded-xl border p-4 text-sm ${invitationFeedback.status === 'sent' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/40 bg-amber-500/10 text-zinc-200'}`}>
              <p>{invitationFeedback.message}</p>
              {invitationFeedback.status === 'failed' && <button type="button" onClick={() => setActiveSubTab('smtp')} className="mt-2 underline font-semibold">Open Email Settings</button>}
            </div>
          )}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Instrument</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {filteredMembers.map(member => {
                    const isSelf = member.id === currentUser.id;

                    return (
                      <tr key={member.id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{member.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-zinc-500 font-mono">{member.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-zinc-300 font-medium">
                          {member.instrument}
                        </td>

                        <td className="py-3 px-4">
                          {isAdmin && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={e => updateUserRole(member.id, e.target.value as Role)}
                              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="member">Member</option>
                              <option value="guest">Guest</option>
                            </select>
                          ) : (
                            <span className="font-semibold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                              {member.role}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isAdmin && !isSelf ? (
                            <select
                              value={member.status || 'active'}
                              onChange={e => updateUserStatus(member.id, e.target.value as UserStatus)}
                              className={`rounded-lg px-2 py-1 text-xs font-semibold border ${
                                member.status === 'suspended'
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="invited">Invited</option>
                            </select>
                          ) : (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                                member.status === 'suspended'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {member.status || 'active'}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                          {member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : 'Active'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin && !isSelf && member.status !== 'suspended' && (
                              <button
                                type="button"
                                onClick={() => handleResendInvite(member)}
                                disabled={invitingUserId !== null}
                                aria-label={`Resend invitation to ${member.name}`}
                                title="Send / resend invitation email"
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition disabled:opacity-50"
                              >
                                {invitingUserId === member.id ? 'Sending…' : 'Resend invite'}
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => setResettingUser(member)}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition"
                                title="Reset Password"
                              >
                                Reset Pass
                              </button>
                            )}

                            {isAdmin && !isSelf && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete user account "${member.name}"?`)) {
                                    deleteUserAccount(member.id);
                                  }
                                }}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition"
                                title="Delete user account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Permissions Matrix */}
          <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>Role Permissions Breakdown</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider">
                    <th className="py-2.5 px-3">Capability</th>
                    <th className="py-2.5 px-3 text-center">Admin</th>
                    <th className="py-2.5 px-3 text-center">Editor</th>
                    <th className="py-2.5 px-3 text-center">Member</th>
                    <th className="py-2.5 px-3 text-center">Guest / Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Upload Audio Demo Tracks</td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Upload Multi-Take Versions (v1, v2...)</td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Edit Lyrics Drafts &amp; Chords</td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3 text-zinc-500 font-mono text-[10px]">Read-only</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Schedule Practices &amp; Rehearsals</td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Delete Song Ideas from Vault</td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Manage Member Roles &amp; Security Settings</td>
                    <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                    <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AUTHENTICATION MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {isAdmin && activeSubTab === 'auth' && (
        <div className="space-y-6">
          {/* Security & Authentication Policies */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Authentication Policies &amp; Security Guards</h3>
              </div>
              {!isAdmin && (
                <span className="text-xs px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 font-mono">
                  Admin Only
                </span>
              )}
            </div>

            <form onSubmit={handleSaveAuthSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Session Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    value={localAuthSettings.sessionTimeoutMinutes}
                    disabled={!isAdmin}
                    onChange={e => setLocalAuthSettings({ ...localAuthSettings, sessionTimeoutMinutes: parseInt(e.target.value, 10) })}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white font-mono disabled:opacity-60"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Session expires after this time from sign-in</p>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Min Password Length
                  </label>
                  <input
                    type="number"
                    min="12"
                    max="32"
                    value={localAuthSettings.minPasswordLength}
                    disabled={!isAdmin}
                    onChange={e => setLocalAuthSettings({ ...localAuthSettings, minPasswordLength: parseInt(e.target.value, 10) })}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white font-mono disabled:opacity-60"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Enforced on all new passwords</p>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Max Failed Login Attempts
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={localAuthSettings.maxFailedLogins}
                    disabled={!isAdmin}
                    onChange={e => setLocalAuthSettings({ ...localAuthSettings, maxFailedLogins: parseInt(e.target.value, 10) })}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white font-mono disabled:opacity-60"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Temporary lock after threshold</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={false}
                    disabled
                    onChange={e => setLocalAuthSettings({ ...localAuthSettings, requireTwoFactor: e.target.checked })}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold text-zinc-200">Enforce Two-Factor Authentication (2FA)</p>
                    <p className="text-[11px] text-zinc-500">Future Feature</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localAuthSettings.requireSpecialChar}
                    disabled={!isAdmin}
                    onChange={e => setLocalAuthSettings({ ...localAuthSettings, requireSpecialChar: e.target.checked })}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold text-zinc-200">Require Special Character &amp; Number</p>
                    <p className="text-[11px] text-zinc-500">Enforces high entropy passwords for portal access</p>
                  </div>
                </label>
              </div>

              {isAdmin && (
                <div className="pt-2 flex items-center justify-end gap-3">
                  {authSaveSuccess && (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      <span>Security policies saved!</span>
                    </span>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition flex items-center gap-1.5 shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Security Policies</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Login Audit Trail & Access Log */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  Live Authentication Audit Trail ({auditLogs.length} events)
                </h3>
              </div>

              {isAdmin && auditLogs.length > 0 && (
                <button
                  onClick={clearAuditLogs}
                  className="px-2.5 py-1 text-zinc-400 hover:text-rose-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[11px] transition"
                >
                  Clear Logs
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {auditLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        log.status === 'success' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <p className="font-semibold text-zinc-200">
                        {log.userName} • <span className="text-zinc-400 font-mono text-[11px]">{log.method}</span>
                      </p>
                      <p className="text-[11px] text-zinc-500">{log.deviceInfo}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 self-end sm:self-auto">
                    <span>IP: {log.ipAddress}</span>
                    <span>•</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Invite Member Modal */}
      {/* ========================================================================= */}
      {isAdmin && isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Add / Invite Band Member</span>
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteUser} className="space-y-3">
              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jordan Smith"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Instrument / Rig
                </label>
                <input
                  type="text"
                  placeholder="e.g. Keyboards & Vocals"
                  value={newUserInstrument}
                  onChange={e => setNewUserInstrument(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  minLength={localAuthSettings.minPasswordLength}
                  autoComplete="new-password"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono"
                  required
                />
                <p className="mt-1.5 text-[11px] text-zinc-500">The invitation includes the sign-in link. Share this initial password separately.</p>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Assigned Role
                </label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as Role)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-medium"
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="member">Member</option>
                  <option value="guest">Guest</option>
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMember || !newUserName.trim() || !newUserEmail.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  {isAddingMember ? 'Saving & Sending…' : 'Save & Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Password Reset Modal */}
      {/* ========================================================================= */}
      {isAdmin && resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Reset Password for {resettingUser.name}</span>
              </h3>
              <button onClick={() => setResettingUser(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">New Temporary Password</label>
                <input
                  type="text"
                  value={newResetPassword}
                  onChange={e => setNewResetPassword(e.target.value)}
                  placeholder="e.g. newPass123!"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold"
                >
                  Set Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Image Crop Modals */}
      {/* ========================================================================= */}
      {isAdmin && <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        initialImageUrl={localAppSettings.headerLogoUrl}
        onCropComplete={(croppedUrl) => {
          if (!isAdmin) return;
          setLocalAppSettings({ ...localAppSettings, headerLogoUrl: croppedUrl });
          updateAppSettings({ headerLogoUrl: croppedUrl });
        }}
      />}

      {/* Version & Release Details Modal */}
      <VersionModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        versionInfo={versionInfo}
        isLoading={isCheckingVersion}
        onCheckUpdates={checkUpdates}
      />
    </div>
  );
};
