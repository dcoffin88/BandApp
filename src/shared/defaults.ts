import type {
  AppSettings,
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
  UserAppearance,
} from '../types/band.ts';

export const DEFAULT_APPEARANCE: UserAppearance = {
  appearance: 'dark',
  radius: 'medium',
  primaryColor: 'amber',
  customColor: '#f59e0b',
};

export function appearanceFrom(settings: UserAppearance): UserAppearance {
  return {
    appearance: settings.appearance ?? DEFAULT_APPEARANCE.appearance,
    radius: settings.radius ?? DEFAULT_APPEARANCE.radius,
    primaryColor: settings.primaryColor,
    customColor: settings.customColor ?? DEFAULT_APPEARANCE.customColor,
  };
}

export const ROLE_PERMISSIONS: Record<Role, UserRolePermissions> = {
  admin: {
    canUploadDemo: true,
    canUploadVersion: true,
    canEditLyrics: true,
    canDeleteTracks: true,
    canSchedulePractice: true,
    canManageMembers: true,
  },
  member: {
    canUploadDemo: true,
    canUploadVersion: true,
    canEditLyrics: true,
    canDeleteTracks: false,
    canSchedulePractice: true,
    canManageMembers: false,
  },
  guest: {
    canUploadDemo: false,
    canUploadVersion: false,
    canEditLyrics: false,
    canDeleteTracks: false,
    canSchedulePractice: false,
    canManageMembers: false,
  },
};
export const DEFAULT_AVATAR =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="#27272a"/><circle cx="64" cy="45" r="22" fill="#a1a1aa"/><path d="M20 128v-12a44 44 0 0 1 88 0v12" fill="#a1a1aa"/></svg>',
  );
export interface SharedState {
  revision: number;
  band: BandProfile;
  songs: SongIdea[];
  practices: PracticeSession[];
  authSettings: AuthSettings;
  appSettings: AppSettings;
  smtpSettings: SmtpSettings;
  auditLogs: LoginAuditEntry[];
  emailLogs: EmailNotificationLog[];
}
export interface SessionState extends SharedState {
  currentUser: BandMember;
  permissions: UserRolePermissions;
}
export interface PublicSessionState {
  currentUser: null;
  bandName: string;
  appSettings: AppSettings;
}
export function emptyState(): SharedState {
  return {
    revision: 0,
    band: {
      id: 'band',
      name: 'RehearsalHQ',
      genre: '',
      motto: '',
      foundedYear: '',
      members: [],
    },
    songs: [],
    practices: [],
    auditLogs: [],
    emailLogs: [],
    authSettings: {
      sessionTimeoutMinutes: 120,
      allowEmailPassword: true,
      allowGoogleAuth: false,
      requireTwoFactor: false,
      minPasswordLength: 12,
      maxFailedLogins: 5,
      requireSpecialChar: false,
      lockoutDurationMinutes: 15,
    },
    appSettings: {
      appearance: 'dark',
      radius: 'medium',
      primaryColor: 'amber',
      headerLogoUrl: '',
      headerLogoShape: 'rounded',
      accentGlow: true,
      headerSubtitle: 'Your band\'s home base.',
    },
    smtpSettings: {
      isEnabled: false,
      host: '',
      port: 587,
      encryption: 'tls',
      authRequired: true,
      username: '',
      password: '',
      fromName: 'RehearsalHQ',
      fromEmail: '',
      replyTo: '',
      notificationTriggers: {
        newDemos: true,
        newVersions: true,
        lyricEdits: true,
        practiceSchedule: true,
        practiceReminder: true,
        practiceEventReminder: true,
        comments: true,
      },
    },
  };
}
