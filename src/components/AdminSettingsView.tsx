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
  UserCog,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { AppSettings, AuthSettings, BandMember, Role, ThemeColor, UserStatus } from '../types/band.ts';
import { ImageCropModal } from './ImageCropModal.tsx';

interface AdminSettingsViewProps {
  initialTab?: 'band' | 'users' | 'auth' | 'profile' | 'app';
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  initialTab = 'band',
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
    logout,
  } = useBand();

  const [activeSubTab, setActiveSubTab] = useState<'band' | 'users' | 'auth' | 'profile' | 'app'>(initialTab);

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
  const [newUserPassword, setNewUserPassword] = useState('password123');

  // Password reset modal state
  const [resettingUser, setResettingUser] = useState<BandMember | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  // Auth Settings Form State
  const [localAuthSettings, setLocalAuthSettings] = useState<AuthSettings>(authSettings);
  const [authSaveSuccess, setAuthSaveSuccess] = useState(false);

  // Profile Management State
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileStageName, setProfileStageName] = useState(currentUser.stageName || '');
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profileInstrument, setProfileInstrument] = useState(currentUser.instrument);
  const [profileBio, setProfileBio] = useState(currentUser.bio || '');
  const [profileGear, setProfileGear] = useState(currentUser.gearList || '');
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar);
  const [profile2FA, setProfile2FA] = useState(currentUser.twoFactorEnabled || false);
  const [profileNotifs, setProfileNotifs] = useState(
    currentUser.notifications || {
      newDemos: true,
      newVersions: true,
      lyricEdits: true,
      practiceReminders: true,
      comments: true,
    }
  );

  // Password change state
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  const isLeader = currentUser.role === 'leader';

  const COLOR_THEMES: { id: ThemeColor; name: string; bg: string; text: string; ring: string; desc: string }[] = [
    {
      id: 'amber',
      name: 'Amber / Vintage Gold',
      bg: 'bg-amber-500',
      text: 'text-amber-400',
      ring: 'ring-amber-500',
      desc: 'Warm tube amp glow, classic rock warmth',
    },
    {
      id: 'cyan',
      name: 'Electric Cyan / Neon',
      bg: 'bg-cyan-500',
      text: 'text-cyan-400',
      ring: 'ring-cyan-500',
      desc: 'Modern alt rock, synthpop, digital edge',
    },
    {
      id: 'purple',
      name: 'Deep Purple / Velvet',
      bg: 'bg-purple-500',
      text: 'text-purple-400',
      ring: 'ring-purple-500',
      desc: 'Psychedelic, midnight dream pop, lush aesthetic',
    },
    {
      id: 'emerald',
      name: 'Emerald / Stage Mint',
      bg: 'bg-emerald-500',
      text: 'text-emerald-400',
      ring: 'ring-emerald-500',
      desc: 'Indie groove, clean acoustic vibe, modern green',
    },
    {
      id: 'rose',
      name: 'Crimson / Punk Rose',
      bg: 'bg-rose-500',
      text: 'text-rose-400',
      ring: 'ring-rose-500',
      desc: 'Heavy grunge, energetic punk, high-voltage red',
    },
    {
      id: 'orange',
      name: 'Sunset Orange / Americana',
      bg: 'bg-orange-500',
      text: 'text-orange-400',
      ring: 'ring-orange-500',
      desc: 'Raw overdrive, desert rock, tape analog heat',
    },
  ];

  // Handlers
  const handleSaveBandSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageMembers) return;
    updateBandName(bandName, bandMotto, bandGenre, bandYear);
    setBandSaveSuccess(true);
    setTimeout(() => setBandSaveSuccess(false), 2500);
  };

  const handleSaveAppSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateAppSettings(localAppSettings);
    setAppSettingsSaveSuccess(true);
    setTimeout(() => setAppSettingsSaveSuccess(false), 2500);
  };

  const handleSaveAuthSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageMembers) return;
    updateAuthSettings(localAuthSettings);
    setAuthSaveSuccess(true);
    setTimeout(() => setAuthSaveSuccess(false), 2500);
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    addBandMember({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      status: 'active',
      instrument: newUserInstrument.trim() || 'Vocals / Guitar',
      password: newUserPassword.trim() || 'password123',
      avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 500)}?w=150&auto=format&fit=crop&q=80`,
    });

    setIsInviteModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserInstrument('');
    setNewUserPassword('password123');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newResetPassword.trim()) return;
    updateUserProfile(resettingUser.id, { password: newResetPassword.trim() });
    setResettingUser(null);
    setNewResetPassword('');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(currentUser.id, {
      name: profileName.trim(),
      stageName: profileStageName.trim(),
      email: profileEmail.trim(),
      instrument: profileInstrument.trim(),
      bio: profileBio.trim(),
      gearList: profileGear.trim(),
      phone: profilePhone.trim(),
      avatar: profileAvatar.trim(),
      twoFactorEnabled: profile2FA,
      notifications: profileNotifs,
    });
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 2500);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeSuccess(false);

    if (currentPasswordInput !== (currentUser.password || 'password123')) {
      setPasswordChangeError('Current password does not match.');
      return;
    }

    if (newPasswordInput.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError('New passwords do not match.');
      return;
    }

    updateUserProfile(currentUser.id, { password: newPasswordInput });
    setPasswordChangeSuccess(true);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setTimeout(() => setPasswordChangeSuccess(false), 3000);
  };

  const filteredMembers = band.members.filter(m =>
    m.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    m.instrument.toLowerCase().includes(userSearch.toLowerCase()) ||
    m.role.toLowerCase().includes(userSearch.toLowerCase())
  );

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
                Admin &amp; Settings Control Center
              </h2>
              <p className="text-xs text-zinc-400">
                Manage App Colors, Header Logo, Band Profile, Member Roles, Authentication Policies, and Profiles.
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
        <button
          onClick={() => setActiveSubTab('app')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeSubTab === 'app'
              ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>App Colors &amp; Header Logo</span>
        </button>

        <button
          onClick={() => setActiveSubTab('band')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeSubTab === 'band'
              ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Guitar className="w-4 h-4" />
          <span>Band &amp; Roles</span>
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

        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeSubTab === 'profile'
              ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <UserCog className="w-4 h-4" />
          <span>Profile Management</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 0. APP SETTINGS (COLORS & HEADER LOGO / NAME AREA EDITOR) */}
      {/* ========================================================================= */}
      {activeSubTab === 'app' && (
        <div className="space-y-6">
          {/* Header Logo & Name Area Live Mockup */}
          <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Header Logo &amp; Name Area Editor</h3>
              </div>
              <span className="text-xs text-zinc-400 font-mono">Live Navbar Preview</span>
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
                  Upload any photo or band artwork. The crop tool lets you zoom, pan, rotate, and crop a crisp square or circular logo.
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
          </div>

          {/* App Colors & Theme Palette */}
          <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">App Color Theme &amp; Accent Palette</h3>
              </div>
              <span className="text-xs text-zinc-400 font-mono">Real-Time Tone Selection</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {COLOR_THEMES.map(theme => {
                const isSelected = localAppSettings.primaryColor === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setLocalAppSettings({ ...localAppSettings, primaryColor: theme.id })}
                    className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 ${
                      isSelected
                        ? 'bg-zinc-800/90 border-amber-500/80 ring-2 ring-amber-500/20 shadow-xl'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl ${theme.bg} shrink-0 mt-0.5 shadow-md flex items-center justify-center`}>
                      {isSelected && <Check className="w-4 h-4 text-zinc-950 stroke-[3]" />}
                    </div>

                    <div className="min-w-0">
                      <p className={`font-bold text-xs sm:text-sm ${theme.text}`}>
                        {theme.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                        {theme.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Ambient Glow Toggle */}
            <div className="pt-3 border-t border-zinc-800">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localAppSettings.accentGlow}
                  onChange={e => setLocalAppSettings({ ...localAppSettings, accentGlow: e.target.checked })}
                  className="rounded accent-amber-500 w-4 h-4"
                />
                <div>
                  <p className="font-semibold text-zinc-200 text-xs">Enable Ambient Stage Lighting &amp; Waveform Glow</p>
                  <p className="text-[11px] text-zinc-500">Adds glowing accents to active playback, waveforms, and navigation badges.</p>
                </div>
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3 text-xs">
              {appSettingsSaveSuccess && (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>App settings and logo saved!</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveAppSettings}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Save className="w-4 h-4" />
                <span>Save App Theme &amp; Header</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. BAND & ROLES TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'band' && (
        <div className="space-y-6">
          {/* Band Profile Editor Form */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Guitar className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Band Identity &amp; Metadata</h3>
              </div>
              {!isLeader && (
                <span className="text-xs px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 font-mono">
                  Leader Edit Only
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
                    disabled={!isLeader}
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
                    disabled={!isLeader}
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
                    disabled={!isLeader}
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
                    disabled={!isLeader}
                    onChange={e => setBandYear(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm font-mono disabled:opacity-60"
                  />
                </div>
              </div>

              {isLeader && (
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
                    <th className="py-2.5 px-3 text-center">Leader / Admin</th>
                    <th className="py-2.5 px-3 text-center">Songwriter</th>
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
      {/* 2. USER MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'users' && (
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

            {isLeader && (
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
                          {isLeader && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={e => updateUserRole(member.id, e.target.value as Role)}
                              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="leader">Leader</option>
                              <option value="songwriter">Songwriter</option>
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
                          {isLeader && !isSelf ? (
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
                            {isLeader && (
                              <button
                                onClick={() => setResettingUser(member)}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition"
                                title="Reset Password"
                              >
                                Reset Pass
                              </button>
                            )}

                            {isLeader && !isSelf && (
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AUTHENTICATION MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'auth' && (
        <div className="space-y-6">
          {/* Security & Authentication Policies */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Authentication Policies &amp; Security Guards</h3>
              </div>
              {!isLeader && (
                <span className="text-xs px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 font-mono">
                  Leader Only
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
                    disabled={!isLeader}
                    onChange={e => setLocalAuthSettings({ ...localAuthSettings, sessionTimeoutMinutes: parseInt(e.target.value, 10) })}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white font-mono disabled:opacity-60"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Automatic logout after inactivity</p>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Min Password Length
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    value={localAuthSettings.minPasswordLength}
                    disabled={!isLeader}
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
                    disabled={!isLeader}
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
                    checked={localAuthSettings.requireTwoFactor}
                    disabled={!isLeader}
                    onChange={e => setLocalAuthSettings({ ...localAuthSettings, requireTwoFactor: e.target.checked })}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold text-zinc-200">Enforce Two-Factor Authentication (2FA)</p>
                    <p className="text-[11px] text-zinc-500">Require TOTP authentication for all band leaders and members</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localAuthSettings.requireSpecialChar}
                    disabled={!isLeader}
                    onChange={e => setLocalAuthSettings({ ...localAuthSettings, requireSpecialChar: e.target.checked })}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold text-zinc-200">Require Special Character &amp; Number</p>
                    <p className="text-[11px] text-zinc-500">Enforces high entropy passwords for portal access</p>
                  </div>
                </label>
              </div>

              {isLeader && (
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

              {isLeader && auditLogs.length > 0 && (
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
      {/* 4. PROFILE MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Personal Profile Details */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <img
                  src={profileAvatar}
                  alt={profileName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/40"
                />
                <div>
                  <h3 className="font-bold text-white text-base">Your Musician Profile</h3>
                  <p className="text-xs text-zinc-400">Update your stage persona, instruments, bio, and contact info</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Stage Name / Moniker
                  </label>
                  <input
                    type="text"
                    value={profileStageName}
                    onChange={e => setProfileStageName(e.target.value)}
                    placeholder="e.g. Dave 'Echo' Coffin"
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Phone / Text (For Rehearsal Alerts)
                  </label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                    placeholder="+1 (555) 234-8901"
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Primary Instrument &amp; Vocal Role
                  </label>
                  <input
                    type="text"
                    value={profileInstrument}
                    onChange={e => setProfileInstrument(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Avatar Image URL
                  </label>
                  <input
                    type="url"
                    value={profileAvatar}
                    onChange={e => setProfileAvatar(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Musician Bio &amp; Style Notes
                  </label>
                  <textarea
                    rows={3}
                    value={profileBio}
                    onChange={e => setProfileBio(e.target.value)}
                    placeholder="Influences, tone preferences, songwriting strengths..."
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Gear List &amp; Live Rig
                  </label>
                  <textarea
                    rows={2}
                    value={profileGear}
                    onChange={e => setProfileGear(e.target.value)}
                    placeholder="Guitars, amps, pedals, synthesizers, microphones..."
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-xs"
                  />
                </div>
              </div>

              {/* Notification Toggles */}
              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <p className="font-semibold text-zinc-300 uppercase tracking-wider">Band Notifications</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileNotifs.newDemos}
                      onChange={e => setProfileNotifs({ ...profileNotifs, newDemos: e.target.checked })}
                      className="accent-amber-500 rounded"
                    />
                    <span>Notify on new audio demo ideas</span>
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileNotifs.newVersions}
                      onChange={e => setProfileNotifs({ ...profileNotifs, newVersions: e.target.checked })}
                      className="accent-amber-500 rounded"
                    />
                    <span>Notify on new audio take versions</span>
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileNotifs.practiceReminders}
                      onChange={e => setProfileNotifs({ ...profileNotifs, practiceReminders: e.target.checked })}
                      className="accent-amber-500 rounded"
                    />
                    <span>Upcoming rehearsal reminders</span>
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileNotifs.comments}
                      onChange={e => setProfileNotifs({ ...profileNotifs, comments: e.target.checked })}
                      className="accent-amber-500 rounded"
                    />
                    <span>Band feedback &amp; comments</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
                {profileSaveSuccess && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>Profile saved!</span>
                  </span>
                )}
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Profile</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Password Change & Security */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Change Password</span>
              </h3>

              {passwordChangeError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {passwordChangeError}
                </div>
              )}

              {passwordChangeSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Password changed successfully!</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPasswordInput}
                    onChange={e => setCurrentPasswordInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPasswordInput}
                    onChange={e => setConfirmPasswordInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition mt-2"
                >
                  Update Password
                </button>
              </form>
            </div>

            {/* Quick Account Summary */}
            <div className="p-5 rounded-3xl bg-zinc-950/60 border border-zinc-800 text-xs space-y-3">
              <p className="font-semibold text-zinc-400 uppercase tracking-wider">Account Information</p>
              <div className="space-y-2 text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Member ID:</span>
                  <span className="font-mono">{currentUser.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Current Role:</span>
                  <span className="font-semibold uppercase text-amber-400">{currentUser.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">2FA Status:</span>
                  <span className={profile2FA ? 'text-emerald-400' : 'text-zinc-500'}>
                    {profile2FA ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Invite Member Modal */}
      {/* ========================================================================= */}
      {isInviteModalOpen && (
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
                  placeholder="e.g. Chris Martin"
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
                  placeholder="chris@bandjam.app"
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
                  type="text"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono"
                  required
                />
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
                  <option value="leader">Leader / Admin</option>
                  <option value="songwriter">Songwriter</option>
                  <option value="member">Member</option>
                  <option value="guest">Guest / Session</option>
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
                  disabled={!newUserName.trim() || !newUserEmail.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  Save &amp; Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Password Reset Modal */}
      {/* ========================================================================= */}
      {resettingUser && (
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
      {/* Image Crop Modal for Band Logo */}
      {/* ========================================================================= */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        initialImageUrl={localAppSettings.headerLogoUrl}
        onCropComplete={(croppedUrl) => {
          setLocalAppSettings({ ...localAppSettings, headerLogoUrl: croppedUrl });
          updateAppSettings({ headerLogoUrl: croppedUrl });
        }}
      />
    </div>
  );
};
