import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  AppSettings,
  UserAppearance,
  AudioVersion,
  AuthSettings,
  BandMember,
  BandProfile,
  EmailNotificationLog,
  LoginAuditEntry,
  PracticeSession,
  Role,
  SmtpSettings,
  SongIdea,
  UserRolePermissions,
  UserStatus,
  AddMemberResult,
  MemberInvitationResult,
} from '../types/band.ts';
import {
  emptyState,
  DEFAULT_AVATAR,
  DEFAULT_APPEARANCE,
  ROLE_PERMISSIONS,
  type SessionState,
  type PublicSessionState,
} from '../shared/defaults.ts';
import { applyTheme } from '../shared/theme.ts';

interface AuthResponse {
  success: boolean;
  message?: string;
}

interface BandContextType {
  band: BandProfile;
  currentUser: BandMember;
  permissions: UserRolePermissions;
  songs: SongIdea[];
  practices: PracticeSession[];
  isAudioInitialized: boolean;
  isAuthenticated: boolean;
  authSettings: AuthSettings;
  auditLogs: LoginAuditEntry[];
  appSettings: AppSettings;
  smtpSettings: SmtpSettings;
  emailLogs: EmailNotificationLog[];
  updateAppSettings: (newSettings: Partial<AppSettings>) => Promise<boolean>;
  updateAppearance: (settings: UserAppearance) => Promise<boolean>;
  updateSmtpSettings: (settings: SmtpSettings) => Promise<boolean>;
  sendTestEmail: (
    toEmail: string,
    templateType?: string,
  ) => Promise<{
    success: boolean;
    message: string;
    log?: EmailNotificationLog;
  }>;
  resendEmail: (
    logId: string,
  ) => Promise<{ success: boolean; message: string }>;
  clearEmailLogs: () => Promise<boolean>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<boolean>;
  updateUserRole: (memberId: string, newRole: Role) => Promise<boolean>;
  updateUserStatus: (memberId: string, status: UserStatus) => Promise<boolean>;
  updateUserProfile: (
    userId: string,
    updates: Partial<BandMember>,
  ) => Promise<boolean>;
  deleteUserAccount: (userId: string) => Promise<boolean>;
  updateAuthSettings: (settings: AuthSettings) => Promise<boolean>;
  clearAuditLogs: () => Promise<boolean>;
  updateBandName: (
    name: string,
    motto?: string,
    genre?: string,
    foundedYear?: string,
  ) => Promise<boolean>;
  addSongIdea: (
    song: Omit<SongIdea, 'id' | 'createdAt' | 'createdBy' | 'activeVersionId'>,
    initialVersionFile: File | Blob,
  ) => Promise<SongIdea>;
  addSongVersion: (
    songId: string,
    newVersion: Omit<
      AudioVersion,
      'id' | 'versionNumber' | 'uploadedAt' | 'uploadedBy'
    >,
    audioFile: File | Blob,
  ) => Promise<void>;
  updateLyrics: (
    songId: string,
    draft: string,
    chordsSheet?: string,
  ) => Promise<boolean>;
  addComment: (
    songId: string,
    text: string,
    timestampSeconds?: number,
  ) => Promise<boolean>;
  deleteSong: (songId: string) => Promise<boolean>;
  setActiveVersion: (songId: string, versionId: string) => Promise<boolean>;
  addPracticeSession: (
    session: Omit<PracticeSession, 'id' | 'createdAt' | 'createdBy' | 'rsvps'>,
  ) => Promise<boolean>;
  updateRsvp: (
    practiceId: string,
    status: 'attending' | 'tentative' | 'declined',
  ) => Promise<boolean>;
  deletePracticeSession: (practiceId: string) => Promise<boolean>;
  addBandMember: (member: Omit<BandMember, 'id'>) => Promise<AddMemberResult>;
  sendMemberInvite: (userId: string) => Promise<MemberInvitationResult>;
}

const BandContext = createContext<BandContextType | null>(null);
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function api<T>(
  url: string,
  body?: unknown,
  method = 'POST',
): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? { credentials: 'same-origin' }
      : {
          method,
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-RehearsalHQ-Request': '1',
          },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(response.status, data.message || 'Request failed.');
  return data;
}
const anonymousUser: BandMember = {
  id: '',
  name: '',
  email: '',
  role: 'guest',
  status: 'active',
  instrument: '',
  avatar: DEFAULT_AVATAR,
};
export const BandProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<SessionState>(() => ({
    ...emptyState(),
    currentUser: anonymousUser,
    permissions: ROLE_PERMISSIONS.guest,
  }));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const epoch = useRef(0);
  const apply = useCallback((next: SessionState) => {
    setState((previous) =>
      next.revision >= previous.revision ? next : previous,
    );
    setAuthenticated(true);
  }, []);
  const clear = useCallback((bandName?: string, appSettings?: AppSettings) => {
    epoch.current++;
    setAuthenticated(false);
    setState((previous) => ({
      ...emptyState(),
      band: { ...emptyState().band, name: bandName ?? previous.band.name },
      appSettings: {
        ...emptyState().appSettings,
        ...(appSettings ?? previous.appSettings),
        ...DEFAULT_APPEARANCE,
      },
      currentUser: anonymousUser,
      permissions: ROLE_PERMISSIONS.guest,
    }));
  }, []);
  const report = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) clear();
    setError(
      err instanceof Error ? err.message : 'Unable to contact the server.',
    );
  };
  const loadSession = useCallback(async () => {
    const generation = epoch.current;
    try {
      const data = await api<SessionState | PublicSessionState>(
        '/api/auth/session',
      );
      if (epoch.current !== generation) return;
      if (data.currentUser) apply(data as SessionState);
      else {
        const branding = data as PublicSessionState;
        clear(branding.bandName, branding.appSettings);
      }
      setReady(true);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to contact the server.',
      );
    }
  }, [apply, clear]);
  useEffect(() => {
    void loadSession();
  }, [loadSession]);
  useEffect(() => {
    return applyTheme(state.appSettings);
  }, [
    state.appSettings.primaryColor,
    state.appSettings.customColor,
    state.appSettings.appearance,
    state.appSettings.radius,
  ]);
  useEffect(() => {
    if (!authenticated) return;
    const refresh = async () => {
      const generation = epoch.current;
      try {
        const data = await api<SessionState>('/api/state');
        if (generation === epoch.current) apply(data);
      } catch (err) {
        if (generation === epoch.current) report(err);
      }
    };
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [authenticated, apply]);
  async function mutate<T = unknown>(
    action: string,
    payload: unknown,
  ): Promise<T> {
    const generation = epoch.current;
    const data = await api<{ state: SessionState; result: T }>('/api/actions', {
      action,
      payload,
    });
    if (generation === epoch.current) apply(data.state);
    return data.result;
  }
  async function save(action: string, payload: unknown): Promise<boolean> {
    try {
      await mutate(action, payload);
      return true;
    } catch (err) {
      report(err);
      return false;
    }
  }
  async function login(email: string, password: string): Promise<AuthResponse> {
    try {
      const data = await api<SessionState>('/api/auth/login', {
        email,
        password,
      });
      epoch.current++;
      setState(data);
      setAuthenticated(true);
      setError('');
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unable to sign in.',
      };
    }
  }
  async function changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResponse> {
    try {
      await api('/api/auth/password', { currentPassword, newPassword });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message:
          err instanceof Error ? err.message : 'Unable to change password.',
      };
    }
  }
  async function logout() {
    try {
      await api('/api/auth/logout', {});
      clear(state.band.name);
      return true;
    } catch (err) {
      report(err);
      return false;
    }
  }
  async function upload(
    file: File | Blob,
    category: string,
    version?: Partial<AudioVersion>,
  ) {
    const blob = file;
    let duration = version?.duration || 14;
    let temporaryUrl = '';
    try {
      temporaryUrl = URL.createObjectURL(blob);
      const audio = new Audio(temporaryUrl);
      await new Promise<void>((resolve) => {
        const finish = () => {
          if (Number.isFinite(audio.duration)) duration = audio.duration;
          audio.removeAttribute('src');
          audio.load();
          resolve();
        };
        audio.onloadedmetadata = finish;
        audio.onerror = finish;
        setTimeout(finish, 1500);
      });
      const mime = blob.type.split(';')[0] || 'audio/wav';
      const response = await fetch(
        `/api/uploads?category=${encodeURIComponent(category)}`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': mime, 'X-RehearsalHQ-Request': '1' },
          body: blob,
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new ApiError(
          response.status,
          data.message || 'Audio upload failed.',
        );
      return {
        label: version?.label || 'v1 - Initial Demo',
        audioUrl: data.audioUrl,
        duration,
        notes: version?.notes || '',
        format: mime,
        fileSize: (blob.size / (1024 * 1024)).toFixed(1) + ' MB',
        waveformSamples: version?.waveformSamples,
      };
    } finally {
      if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
    }
  }
  async function addSongIdea(
    song: Omit<SongIdea, 'id' | 'createdAt' | 'createdBy' | 'activeVersionId'>,
    file: File | Blob,
  ) {
    try {
      const version = await upload(file, song.category, {
        ...song.versions?.[0],
        notes: song.description,
      });
      return await mutate<SongIdea>('song.add', {
        title: song.title,
        category: song.category,
        bpm: song.bpm,
        musicalKey: song.musicalKey,
        description: song.description,
        tags: song.tags,
        lyrics: {
          draft: song.lyrics.draft,
          chordsSheet: song.lyrics.chordsSheet,
        },
        version,
      });
    } catch (err) {
      report(err);
      throw err;
    }
  }
  async function addSongVersion(
    songId: string,
    version: Omit<
      AudioVersion,
      'id' | 'versionNumber' | 'uploadedAt' | 'uploadedBy'
    >,
    file: File | Blob,
  ) {
    try {
      const target = state.songs.find((s) => s.id === songId);
      await mutate('song.version', {
        songId,
        version: await upload(file, target?.category || 'idea', version),
      });
    } catch (err) {
      report(err);
      throw err;
    }
  }
  async function mail(url: string, body: unknown) {
    try {
      const result = await api<{
        success: boolean;
        message: string;
        log?: EmailNotificationLog;
        state: SessionState;
      }>(url, body);
      apply(result.state);
      return result;
    } catch (err) {
      report(err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Email request failed.',
      };
    }
  }
  const value: BandContextType = {
    ...state,
    isAuthenticated: authenticated,
    isAudioInitialized: true,
    login,
    changePassword,
    logout,
    updateAppSettings: (settings) => save('app.update', settings),
    updateAppearance: (settings) => save('appearance.update', settings),
    updateSmtpSettings: (settings) => save('smtp.update', settings),
    sendTestEmail: (toEmail) => mail('/api/smtp/test', { to: toEmail }),
    resendEmail: (logId) => mail('/api/smtp/resend', { logId }),
    clearEmailLogs: () => save('email.clear', {}),
    updateUserRole: (userId, role) => save('member.role', { userId, role }),
    updateUserStatus: (userId, status) =>
      save('member.status', { userId, status }),
    updateUserProfile: (userId, updates) =>
      updates.password !== undefined
        ? save('member.password', { userId, password: updates.password })
        : save('member.profile', { userId, updates }),
    deleteUserAccount: (userId) => save('member.delete', { userId }),
    updateAuthSettings: (settings) => save('auth.update', settings),
    clearAuditLogs: () => save('audit.clear', {}),
    updateBandName: (name, motto, genre, foundedYear) =>
      save('band.update', { name, motto, genre, foundedYear }),
    addSongIdea,
    addSongVersion,
    updateLyrics: (songId, draft, chordsSheet) =>
      save('song.lyrics', { songId, draft, chordsSheet }),
    addComment: (songId, text, timestampSeconds) =>
      save('song.comment', { songId, text, timestampSeconds }),
    deleteSong: (songId) => save('song.delete', { songId }),
    setActiveVersion: (songId, versionId) =>
      save('song.active', { songId, versionId }),
    addPracticeSession: (session) => save('practice.add', session),
    updateRsvp: (practiceId, status) =>
      save('practice.rsvp', { practiceId, status }),
    deletePracticeSession: (practiceId) =>
      save('practice.delete', { practiceId }),
    addBandMember: async (member) => {
      try {
        const result = await mutate<Omit<AddMemberResult, 'success'>>(
          'member.add',
          member,
        );
        return { success: true, ...result };
      } catch (error) {
        report(error);
        return { success: false };
      }
    },
    sendMemberInvite: async (userId) => {
      try {
        const result = await mutate<{ invitation: MemberInvitationResult }>(
          'member.invite',
          { userId },
        );
        return result.invitation;
      } catch (error) {
        report(error);
        return {
          status: 'failed',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to send the invitation.',
        };
      }
    },
  };
  if (!ready)
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center gap-4">
        <p>{error || 'Connecting to RehearsalHQ…'}</p>
        {error && (
          <button
            onClick={() => void loadSession()}
            className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950"
          >
            Retry
          </button>
        )}
      </div>
    );
  return (
    <BandContext.Provider value={value}>
      {error && (
        <div
          role="alert"
          className="fixed bottom-4 left-4 right-4 z-[100] p-4 bg-rose-950 border border-rose-500 rounded-xl text-white flex justify-between gap-4"
        >
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss error">
            Dismiss
          </button>
        </div>
      )}
      {children}
    </BandContext.Provider>
  );
};
export const useBand = () => {
  const context = useContext(BandContext);
  if (!context) throw new Error('useBand must be used within BandProvider');
  return context;
};
