import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Clock3,
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
  Tags,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { AppSettings, AuthSettings, BandMember, ExistingUserOption, Role, UserStatus, MemberInvitationResult, UserRolePermissions } from '../types/band.ts';
import { ImageCropModal } from './ImageCropModal.tsx';
import { SmtpSettingsView } from './SmtpSettingsView.tsx';
import { DEFAULT_AVATAR, ROLE_PERMISSIONS } from '../shared/defaults.ts';
import { useAppVersion } from '../hooks/useAppVersion.ts';
import { RehearsalHQLogo } from './RehearsalHQLogo.tsx';
import { VersionModal } from './VersionModal.tsx';
import { memberDisplayName, roleDisplayName } from '../shared/member.ts';
import { timeFormatOptions } from '../shared/time.ts';

interface AdminSettingsViewProps {
  initialTab?: 'users' | 'auth' | 'app' | 'smtp';
}

const ROLE_OPTIONS: Array<{ value: Role; label: string; matrixLabel: string }> = [
  { value: 'admin', label: 'Band Admin', matrixLabel: 'Band Admin' },
  { value: 'member', label: 'Band Member', matrixLabel: 'Band Member' },
  { value: 'guest', label: 'Band Guest', matrixLabel: 'Band Guest' },
];

const PERMISSION_MATRIX_ROLES: Array<{
  value: Role | 'super_admin';
  matrixLabel: string;
}> = [
  { value: 'super_admin', matrixLabel: 'Super Admin' },
  ...ROLE_OPTIONS.map(({ value, matrixLabel }) => ({ value, matrixLabel })),
];

const PERMISSION_ROWS: Array<{
  label: string;
  permission?: keyof UserRolePermissions;
  superAdminOnly?: boolean;
}> = [
  { label: 'Upload Audio Demo Tracks', permission: 'canUploadDemo' },
  { label: 'Upload Multi-Take Versions (v1, v2...)', permission: 'canUploadVersion' },
  { label: 'Edit Lyrics, Chords & Tabs', permission: 'canEditLyrics' },
  { label: 'Schedule Practices & Rehearsals', permission: 'canSchedulePractice' },
  { label: 'Archive Song Ideas from Vault', permission: 'canDeleteTracks' },
  { label: 'Manage Band Members & Roles', permission: 'canManageMembers' },
  { label: 'Create Band Instances', superAdminOnly: true },
  { label: 'Grant or Remove Super Admin Access', superAdminOnly: true },
  { label: 'Manage Global Application Settings', superAdminOnly: true },
  { label: 'Manage Global Application Security', superAdminOnly: true },
];

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  initialTab = 'app',
}) => {
  const {
    band,
    currentUser,
    permissions,
    authSettings,
    smtpSettings,
    auditLogs,
    appSettings,
    songs,
    updateBandName,
    updateUserRole,
    updateUserStatus,
    updateSuperAdmin,
    updateUserProfile,
    resetUserTwoFactor,
    sendUserPasswordReset,
    deleteUserAccount,
    updateAuthSettings,
    updateAppSettings,
    clearAuditLogs,
    addBandMember,
    addExistingBandMember,
    getAvailableUsers,
    sendMemberInvite,
    createBand,
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
  const [newBandName, setNewBandName] = useState('');
  const [bandCreateSuccess, setBandCreateSuccess] = useState(false);

  // App Settings & Header Logo State
  const [localAppSettings, setLocalAppSettings] = useState<AppSettings>(appSettings);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [appSettingsSaveSuccess, setAppSettingsSaveSuccess] = useState(false);
  const [timeSettingsSaveSuccess, setTimeSettingsSaveSuccess] = useState(false);
  const [archiveSettingsSaveSuccess, setArchiveSettingsSaveSuccess] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categorySaveSuccess, setCategorySaveSuccess] = useState(false);

  // User Management State
  const [userSearch, setUserSearch] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('member');
  const [newUserInstrument, setNewUserInstrument] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isExistingUserModalOpen, setIsExistingUserModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<ExistingUserOption[]>([]);
  const [selectedExistingUserId, setSelectedExistingUserId] = useState('');
  const [existingUserRole, setExistingUserRole] = useState<Role>('member');
  const [isLoadingExistingUsers, setIsLoadingExistingUsers] = useState(false);
  const [isAddingExistingUser, setIsAddingExistingUser] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [invitationFeedback, setInvitationFeedback] = useState<MemberInvitationResult | null>(null);

  // Password reset modal state
  const [resettingUser, setResettingUser] = useState<BandMember | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [passwordResettingUserId, setPasswordResettingUserId] = useState<string | null>(null);
  const [promotingUser, setPromotingUser] = useState<BandMember | null>(null);
  const [isUpdatingSuperAdmin, setIsUpdatingSuperAdmin] = useState(false);

  // Auth Settings Form State
  const [localAuthSettings, setLocalAuthSettings] = useState<AuthSettings>(authSettings);
  const [authSaveSuccess, setAuthSaveSuccess] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const activeSubTab = ['auth', 'smtp'].includes(selectedSubTab) && !currentUser.isSuperAdmin
    ? 'app'
    : selectedSubTab;

  // Handlers
  const handleSaveBandSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageMembers) return;
    if (!await updateBandName(bandName, bandMotto, bandGenre, bandYear)) return;
    setBandSaveSuccess(true);
    setTimeout(() => setBandSaveSuccess(false), 2500);
  };

  const handleCreateBand = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBandName.trim();
    if (!name || !(await createBand(name))) return;
    setNewBandName('');
    setBandCreateSuccess(true);
    setTimeout(() => setBandCreateSuccess(false), 2500);
  };

  const handleSaveAppSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const { headerLogoUrl, headerLogoShape, headerSubtitle, accentGlow } = localAppSettings;
    if (!await updateAppSettings({ headerLogoUrl, headerLogoShape, headerSubtitle, accentGlow })) return;
    setAppSettingsSaveSuccess(true);
    setTimeout(() => setAppSettingsSaveSuccess(false), 2500);
  };

  const handleSaveTimeSettings = async () => {
    if (!isAdmin) return;
    if (!(await updateAppSettings({ timeFormat: localAppSettings.timeFormat }))) return;
    setTimeSettingsSaveSuccess(true);
    setTimeout(() => setTimeSettingsSaveSuccess(false), 2500);
  };

  const handleSaveArchiveSettings = async () => {
    if (!isAdmin) return;
    if (!(await updateAppSettings({
      autoDeleteArchivedDemos: localAppSettings.autoDeleteArchivedDemos,
    }))) return;
    setArchiveSettingsSaveSuccess(true);
    setTimeout(() => setArchiveSettingsSaveSuccess(false), 2500);
  };

  const handleAddCategory = () => {
    const label = newCategoryName.trim();
    if (!label) {
      setCategoryError('Enter a category name.');
      return;
    }
    if (
      localAppSettings.demoCategories.some(
        (category) => category.label.toLowerCase() === label.toLowerCase(),
      )
    ) {
      setCategoryError('Category names must be unique.');
      return;
    }
    const baseId =
      label
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 42) || 'category';
    const existingIds = new Set(
      localAppSettings.demoCategories.map((category) => category.id),
    );
    let id = baseId;
    let suffix = 2;
    while (existingIds.has(id)) id = `${baseId}-${suffix++}`;
    setLocalAppSettings({
      ...localAppSettings,
      demoCategories: [...localAppSettings.demoCategories, { id, label }],
    });
    setNewCategoryName('');
    setCategoryError('');
    setCategorySaveSuccess(false);
  };

  const handleSaveCategories = async () => {
    const categories = localAppSettings.demoCategories.map((category) => ({
      ...category,
      label: category.label.trim(),
    }));
    if (categories.some((category) => !category.label)) {
      setCategoryError('Category names cannot be blank.');
      return;
    }
    if (
      new Set(categories.map((category) => category.label.toLowerCase())).size !==
      categories.length
    ) {
      setCategoryError('Category names must be unique.');
      return;
    }
    if (!(await updateAppSettings({ demoCategories: categories }))) {
      setCategoryError('Unable to save demo categories.');
      return;
    }
    setLocalAppSettings({ ...localAppSettings, demoCategories: categories });
    setCategoryError('');
    setCategorySaveSuccess(true);
    setTimeout(() => setCategorySaveSuccess(false), 2500);
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
      password: smtpSettings.isEnabled ? undefined : newUserPassword,
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

  const openExistingUserModal = async () => {
    setIsExistingUserModalOpen(true);
    setIsLoadingExistingUsers(true);
    const users = await getAvailableUsers();
    setAvailableUsers(users);
    setSelectedExistingUserId(users[0]?.id || '');
    setIsLoadingExistingUsers(false);
  };

  const handleAddExistingUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingUserId || isAddingExistingUser) return;
    setIsAddingExistingUser(true);
    setInvitationFeedback(null);
    const saved = await addExistingBandMember(selectedExistingUserId, existingUserRole);
    setIsAddingExistingUser(false);
    if (!saved.success) return;
    if (saved.invitation) {
      setInvitationFeedback({
        ...saved.invitation,
        message: `Existing user added to ${band.name}. ${saved.invitation.message}`,
      });
    }
    setIsExistingUserModalOpen(false);
    setAvailableUsers([]);
    setSelectedExistingUserId('');
    setExistingUserRole('member');
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

  const handleSendPasswordReset = async (member: BandMember) => {
    if (passwordResettingUserId) return;
    setPasswordResettingUserId(member.id);
    setInvitationFeedback(null);
    const result = await sendUserPasswordReset(member.id);
    setPasswordResettingUserId(null);
    setInvitationFeedback({
      status: result.success ? 'sent' : 'failed',
      message: result.message,
    });
  };

  const filteredMembers = band.members.filter(m =>
    m.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    memberDisplayName(m).toLowerCase().includes(userSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    m.instrument.toLowerCase().includes(userSearch.toLowerCase()) ||
    roleDisplayName(m.role, m.isSuperAdmin).toLowerCase().includes(userSearch.toLowerCase())
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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-1 text-xs font-semibold">
        <div className="relative lg:hidden">
          <select
            aria-label="Admin settings section"
            value={activeSubTab}
            onChange={(event) => setActiveSubTab(event.target.value as 'users' | 'auth' | 'app' | 'smtp')}
            className="w-full appearance-none rounded-xl bg-zinc-900 py-2.5 pl-3 pr-9 font-semibold text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="app">App Settings</option>
            <option value="users">User Management ({band.members.length})</option>
            {currentUser.isSuperAdmin && <option value="auth">Authentication Management</option>}
            {currentUser.isSuperAdmin && <option value="smtp">Email Settings</option>}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        </div>

        <div className="hidden items-center gap-2 lg:flex">
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

        {currentUser.isSuperAdmin && <button
          onClick={() => setActiveSubTab('auth')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeSubTab === 'auth'
              ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Authentication Management</span>
        </button>}
        </>}

        {currentUser.isSuperAdmin && <button onClick={() => setActiveSubTab('smtp')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${activeSubTab === 'smtp' ? 'bg-amber-500 text-zinc-950 shadow-md font-bold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}><Mail className="w-4 h-4"/><span>Email Settings</span></button>}
        </div>
      </div>

      {currentUser.isSuperAdmin && activeSubTab === 'smtp' && <SmtpSettingsView />}

      {/* ========================================================================= */}
      {/* APP SETTINGS (BAND IDENTITY & HEADER LOGO / NAME AREA EDITOR) */}
      {/* ========================================================================= */}
      {isAdmin && activeSubTab === 'app' && (
        <div className="space-y-6">
          {currentUser.isSuperAdmin && (
            <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Band Instances</h3>
                  <p className="text-xs text-zinc-400">Create a separate workspace for your band or another band. Invite new users or add existing accounts through User Management.</p>
                </div>
              </div>
              <form onSubmit={handleCreateBand} className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={newBandName}
                  onChange={(event) => setNewBandName(event.target.value)}
                  placeholder="New band name"
                  maxLength={200}
                  required
                  className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                />
                <button type="submit" className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-amber-400">
                  Create Band
                </button>
              </form>
              {bandCreateSuccess && <p className="mt-2 text-xs text-emerald-400">Band created. Use the band switcher in your account menu to open it.</p>}
            </div>
          )}
          {/* Band Profile Editor Form */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Guitar className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Band Identity &amp; Metadata</h3>
              </div>
              {!isAdmin && (
                <span className="text-xs px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 font-mono">
                  Band Admin Edit Only
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

          {/* Demo Category Management */}
          <div className="min-w-0 space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-6">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Tags className="h-5 w-5 shrink-0 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Demo Category Management
            </h3>
          </div>

          {categoryError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {categoryError}
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-2 xl:grid-cols-2">
            {localAppSettings.demoCategories.map((category) => {
              const assignedCount = songs.filter(
                (song) => song.category === category.id,
              ).length;

              const selectableCount = localAppSettings.demoCategories.filter(
                (item) => item.id !== 'all' && item.id !== 'archived',
              ).length;

              const cannotRemove =
                category.id === 'all' ||
                category.id === 'archived' ||
                assignedCount > 0 ||
                selectableCount <= 1;

              return (
                <div
                  key={category.id}
                  className="grid min-w-0 grid-cols-1 gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <input
                    type="text"
                    value={category.label}
                    maxLength={200}
                    onChange={(event) => {
                      setCategorySaveSuccess(false);
                      setLocalAppSettings({
                        ...localAppSettings,
                        demoCategories: localAppSettings.demoCategories.map(
                          (item) =>
                            item.id === category.id
                              ? { ...item, label: event.target.value }
                              : item,
                        ),
                      });
                    }}
                    className="w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    aria-label={`Category name for ${category.id}`}
                  />

                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <span className="w-40 shrink-0 text-right text-[10px] text-zinc-500">
                      {category.id === 'all'
                        ? 'Required library filter'
                        : category.id === 'archived'
                          ? 'Required archive filter'
                          : `${assignedCount} ${
                              assignedCount === 1 ? 'demo' : 'demos'
                            }`}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setLocalAppSettings({
                          ...localAppSettings,
                          demoCategories: localAppSettings.demoCategories.filter(
                            (item) => item.id !== category.id,
                          ),
                        });
                        setCategoryError('');
                        setCategorySaveSuccess(false);
                      }}
                      disabled={cannotRemove}
                      className="shrink-0 rounded-lg border border-zinc-700 p-2 text-zinc-400 transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30"
                      title={
                        category.id === 'all' || category.id === 'archived'
                          ? `${category.label} is required`
                          : assignedCount > 0
                            ? 'Move demos out of this category before removing it'
                            : selectableCount <= 1
                              ? 'At least one demo category is required'
                              : `Remove ${category.label}`
                      }
                      aria-label={`Remove ${category.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleAddCategory();
            }}
            className="flex flex-col gap-2 border-t border-zinc-800 pt-4 sm:flex-row"
          >
            <input
              type="text"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              maxLength={200}
              placeholder="New category name"
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
            />

            <button
              type="submit"
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-800 pt-3 text-xs">
            {categorySaveSuccess && (
              <span className="flex items-center gap-1 font-medium text-emerald-400">
                <Check className="h-4 w-4" />
                Categories saved!
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveCategories}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 font-bold text-zinc-950 transition hover:bg-amber-400"
            >
              <Save className="h-4 w-4" />
              Save Categories
            </button>
          </div>
        </div>

          {/* Header Logo & Name Area */}
          {isAdmin && (
          <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Header Logo &amp; Name Area Editor</h3>
              </div>
            </div>

            {/* Header Preview Box */}
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
                    } ${localAppSettings.accentGlow ? 'theme-glow-accent' : ''}`}
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-zinc-950 font-black ${localAppSettings.accentGlow ? 'theme-glow-accent' : ''}`}>
                    <RehearsalHQLogo className="w-6 h-6 text-zinc-950" />
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
                      title="Revert to default icon"
                    >
                      Reset to Icon
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Upload logo or photo.
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
            <div className="pt-3 border-t border-zinc-800">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localAppSettings.accentGlow}
                  onChange={(e) =>
                    setLocalAppSettings({
                      ...localAppSettings,
                      accentGlow: e.target.checked,
                    })
                  }
                  className="rounded accent-amber-500 w-4 h-4"
                />
                <div>
                  <p className="font-semibold text-zinc-200 text-xs">
                    Enable Ambient Lighting &amp; Glow
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Adds a glow around the band logo in the navigation header.
                  </p>
                </div>
              </label>
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

          <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <Clock3 className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Time Display</h3>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-3">
                Choose how time appears throughout RehearsalHQ.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: '12' as const, label: '12 hour', example: '3:30 PM' },
                  { id: '24' as const, label: '24 hour', example: '15:30' },
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLocalAppSettings({
                      ...localAppSettings,
                      timeFormat: option.id,
                    })}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      localAppSettings.timeFormat === option.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs font-semibold">{option.label}</span>
                    <span className="font-mono text-xs opacity-80">{option.example}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3 text-xs">
              {timeSettingsSaveSuccess && (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Time display saved!</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveTimeSettings}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Save className="w-4 h-4" />
                <span>Save Time Display</span>
              </button>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <Trash2 className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Archive Retention</h3>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <input
                type="checkbox"
                checked={localAppSettings.autoDeleteArchivedDemos}
                onChange={(event) => {
                  setLocalAppSettings({
                    ...localAppSettings,
                    autoDeleteArchivedDemos: event.target.checked,
                  });
                  setArchiveSettingsSaveSuccess(false);
                }}
                className="mt-0.5 h-4 w-4 rounded accent-amber-500"
              />
              <div>
                <p className="text-xs font-semibold text-zinc-200">
                  Automatically delete archived demos after 30 days
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  Permanently removes the demo, every audio take, and its setlist references after it has remained archived for 30 days.
                </p>
              </div>
            </label>
            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-3 text-xs">
              {archiveSettingsSaveSuccess && (
                <span className="flex items-center gap-1 font-medium text-emerald-400">
                  <Check className="h-4 w-4" /> Archive retention saved!
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveArchiveSettings}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 font-bold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
              >
                <Save className="h-4 w-4" />
                Save Archive Retention
              </button>
            </div>
          </div>

          {/* Application Version & GitHub Release Tracking */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <RehearsalHQLogo className="w-4 h-4" />
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
                    dcoffin88 / RehearsalHQ
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href="https://github.com/dcoffin88/RehearsalHQ/releases/latest"
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => void openExistingUserModal()}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-200 shadow-md transition hover:border-amber-500/50 hover:text-white"
                >
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>Add / Invite Existing User</span>
                </button>
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 shadow-md transition hover:bg-amber-400"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add / Invite New User</span>
                </button>
              </div>
            )}
          </div>

          {/* User Directory Table */}
          {invitationFeedback && (
            <div role="status" className={`rounded-xl border p-4 text-sm ${invitationFeedback.status === 'sent' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/40 bg-amber-500/10 text-zinc-200'}`}>
              <p>{invitationFeedback.message}</p>
              {invitationFeedback.status === 'failed' && currentUser.isSuperAdmin && <button type="button" onClick={() => setActiveSubTab('smtp')} className="mt-2 underline font-semibold">Open Email Settings</button>}
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
                    const displayName = memberDisplayName(member);
                    const canManageMember = Boolean(
                      currentUser.isSuperAdmin ||
                      isSelf ||
                      (!member.isSuperAdmin && member.role !== 'admin'),
                    );

                    return (
                      <tr key={member.id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={member.avatar}
                              alt={displayName}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{displayName}</span>
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                                    YOU
                                  </span>
                                )}
                                {member.isSuperAdmin && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                                    SUPER ADMIN
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
                          {isAdmin && canManageMember ? (
                            <select
                              value={member.role}
                              onChange={e => updateUserRole(member.id, e.target.value as Role)}
                              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              {ROLE_OPTIONS.map(role => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-semibold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                              {roleDisplayName(member.role, member.isSuperAdmin)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {currentUser.isSuperAdmin && !isSelf ? (
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
                            {currentUser.isSuperAdmin && !isSelf && (
                              <button
                                type="button"
                                onClick={() => {
                                  const enabling = !member.isSuperAdmin;
                                  if (enabling) setPromotingUser(member);
                                  else void updateSuperAdmin(member.id, false);
                                }}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-purple-500/20 text-zinc-300 hover:text-purple-300 text-[11px] transition"
                                title={member.isSuperAdmin ? 'Remove Super Admin access' : 'Grant Super Admin access and add this user to every band'}
                              >
                                {member.isSuperAdmin ? 'Remove Super Admin' : 'Make Super Admin'}
                              </button>
                            )}
                            {isAdmin && !isSelf && canManageMember && member.status !== 'suspended' && !member.lastLogin && (
                              <button
                                type="button"
                                onClick={() => handleResendInvite(member)}
                                disabled={invitingUserId !== null}
                                aria-label={`Resend invitation to ${displayName}`}
                                title="Send / resend invitation email"
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition disabled:opacity-50"
                              >
                                {invitingUserId === member.id ? 'Sending…' : 'Resend invite'}
                              </button>
                            )}
                            {isAdmin && !isSelf && canManageMember && (!smtpSettings.isEnabled || member.status === 'active') && (
                              <button
                                onClick={() => smtpSettings.isEnabled
                                  ? void handleSendPasswordReset(member)
                                  : setResettingUser(member)}
                                disabled={passwordResettingUserId !== null}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition disabled:opacity-50"
                                title={smtpSettings.isEnabled ? 'Email a password reset link' : 'Set a temporary password'}
                              >
                                {passwordResettingUserId === member.id ? 'Sending…' : 'Reset Pass'}
                              </button>
                            )}

                            {isAdmin && canManageMember && member.twoFactorEnabled && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Reset two-factor authentication for ${displayName}? They will need to enroll again at their next sign-in.`)) {
                                    void resetUserTwoFactor(member.id);
                                  }
                                }}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 text-[11px] transition"
                                title="Reset two-factor authentication"
                              >
                                Reset 2FA
                              </button>
                            )}

                            {isAdmin && !isSelf && canManageMember && (
                              <button
                                onClick={() => {
                                  if (confirm(`Remove "${displayName}" from ${band.name}? Their account and access to other bands will remain.`)) {
                                    deleteUserAccount(member.id);
                                  }
                                }}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition"
                                title="Remove user from this band"
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
            <p className="text-xs text-zinc-500">
              Super Admin is an account-level capability. Band Admin, Band Member, and Band Guest permissions apply separately within each band.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider">
                    <th className="py-2.5 px-3">Capability</th>
                    {PERMISSION_MATRIX_ROLES.map(role => (
                      <th key={role.value} className="py-2.5 px-3 text-center">{role.matrixLabel}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {PERMISSION_ROWS.map(row => (
                    <tr key={row.permission || row.label}>
                      <td className="py-2.5 px-3 font-medium">{row.label}</td>
                      {PERMISSION_MATRIX_ROLES.map(role => {
                        const allowed = role.value === 'super_admin'
                          ? true
                          : !row.superAdminOnly && Boolean(
                              row.permission && ROLE_PERMISSIONS[role.value][row.permission],
                            );
                        return (
                          <td key={role.value} className="text-center py-2.5 px-3">
                            {allowed ? (
                              <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-zinc-600 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {currentUser.isSuperAdmin && promotingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="super-admin-confirmation-title"
            className="w-full max-w-md space-y-5 rounded-2xl border border-purple-500/40 bg-zinc-900 p-6 text-sm shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                <Crown className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="super-admin-confirmation-title" className="font-bold text-white">
                  Make {memberDisplayName(promotingUser)} a Super Admin?
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  This gives the user full access to manage the application and full Band Admin access to every existing and future band.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPromotingUser(null)}
                disabled={isUpdatingSuperAdmin}
                aria-label="Close Super Admin confirmation"
                className="text-zinc-500 transition hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-100">
              Super Admins can create band instances, manage global account security, grant Super Admin access, and manage every band as a Band Admin.
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
              Are you sure you want to continue?
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={() => setPromotingUser(null)}
                disabled={isUpdatingSuperAdmin}
                className="rounded-lg px-4 py-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingSuperAdmin}
                onClick={async () => {
                  setIsUpdatingSuperAdmin(true);
                  const saved = await updateSuperAdmin(promotingUser.id, true);
                  setIsUpdatingSuperAdmin(false);
                  if (saved) setPromotingUser(null);
                }}
                className="rounded-lg bg-purple-500 px-4 py-2 font-bold text-white transition hover:bg-purple-400 disabled:cursor-wait disabled:opacity-60"
              >
                {isUpdatingSuperAdmin ? 'Granting Access…' : 'Make Super Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AUTHENTICATION MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {currentUser.isSuperAdmin && activeSubTab === 'auth' && (
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
                  Super Admin Only
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
                    checked={localAuthSettings.requireTwoFactor}
                    disabled={!isAdmin}
                    onChange={e => setLocalAuthSettings({ ...localAuthSettings, requireTwoFactor: e.target.checked })}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold text-zinc-200">Enforce Two-Factor Authentication (2FA)</p>
                    <p className="text-[11px] text-zinc-500">Members enroll an authenticator app at their next sign-in</p>
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
                    <span>{new Date(log.timestamp).toLocaleString(undefined, timeFormatOptions(appSettings.timeFormat))}</span>
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
                <span>Add / Invite New User</span>
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

              {smtpSettings.isEnabled ? (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-[11px] leading-relaxed text-emerald-200">
                  The invitation email will include a secure, one-time link for this user to choose their password.
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Initial Password *
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
                  <p className="mt-1.5 text-[11px] text-zinc-500">SMTP is disabled. Share this initial password with the user separately.</p>
                </div>
              )}

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Assigned Role
                </label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as Role)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-medium"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
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
                  disabled={isAddingMember || !newUserName.trim() || !newUserEmail.trim() || (!smtpSettings.isEnabled && !newUserPassword)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  {isAddingMember ? 'Saving & Sending…' : 'Save & Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && isExistingUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="existing-user-modal-title"
            className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 id="existing-user-modal-title" className="flex items-center gap-2 text-base font-bold text-white">
                  <UserCheck className="h-4 w-4 text-amber-400" />
                  <span>Add / Invite Existing User</span>
                </h3>
                <p className="mt-1 text-[11px] text-zinc-500">Add an existing RehearsalHQ account to {band.name}.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsExistingUserModalOpen(false)}
                disabled={isAddingExistingUser}
                aria-label="Close existing user dialog"
                className="text-zinc-400 hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoadingExistingUsers ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-400">
                Loading available users…
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 text-center">
                <p className="font-semibold text-zinc-200">No existing users are available.</p>
                <p className="mt-1 text-zinc-500">Every account already belongs to this band, or a new account needs to be created.</p>
              </div>
            ) : (
              <form onSubmit={handleAddExistingUser} className="space-y-4">
                <div>
                  <label className="mb-1.5 block font-semibold uppercase tracking-wider text-zinc-300">
                    Existing Account
                  </label>
                  <select
                    value={selectedExistingUserId}
                    onChange={(event) => setSelectedExistingUserId(event.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    required
                  >
                    {availableUsers.map((availableUser) => (
                      <option key={availableUser.id} value={availableUser.id}>
                        {availableUser.stageName?.trim() || availableUser.name} — {availableUser.email}
                      </option>
                    ))}
                  </select>
                  {selectedExistingUserId && (() => {
                    const selected = availableUsers.find((availableUser) => availableUser.id === selectedExistingUserId);
                    return selected ? (
                      <p className="mt-1.5 text-[11px] text-zinc-500">
                        {selected.instrument || 'No instrument listed'} · Existing account credentials will be preserved.
                      </p>
                    ) : null;
                  })()}
                </div>

                <div>
                  <label className="mb-1.5 block font-semibold uppercase tracking-wider text-zinc-300">
                    Role in {band.name}
                  </label>
                  <select
                    value={existingUserRole}
                    onChange={(event) => setExistingUserRole(event.target.value as Role)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsExistingUserModalOpen(false)}
                    disabled={isAddingExistingUser}
                    className="px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingExistingUser || !selectedExistingUserId}
                    className="rounded-xl bg-amber-500 px-5 py-2 font-bold text-zinc-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isAddingExistingUser ? 'Adding User…' : 'Add & Send Invite'}
                  </button>
                </div>
              </form>
            )}
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
                  type="password"
                  autoComplete="new-password"
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
