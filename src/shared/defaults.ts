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
} from '../types/band.ts';

export const ROLE_PERMISSIONS: Record<Role, UserRolePermissions> = {
  admin: {
    canUploadDemo: true,
    canUploadVersion: true,
    canEditLyrics: true,
    canDeleteTracks: true,
    canSchedulePractice: true,
    canManageMembers: true,
  },
  editor: {
    canUploadDemo: true,
    canUploadVersion: true,
    canEditLyrics: true,
    canDeleteTracks: false,
    canSchedulePractice: true,
    canManageMembers: false,
  },
  member: {
    canUploadDemo: true,
    canUploadVersion: true,
    canEditLyrics: true,
    canDeleteTracks: false,
    canSchedulePractice: false,
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
      name: 'BandApp',
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
      headerSubtitle: 'Band Collaboration & Demo Vault',
    },
    smtpSettings: {
      isEnabled: false,
      host: '',
      port: 587,
      encryption: 'tls',
      authRequired: true,
      username: '',
      password: '',
      fromName: 'BandApp',
      fromEmail: '',
      replyTo: '',
      notificationTriggers: {
        newDemos: true,
        newVersions: true,
        lyricEdits: true,
        practiceSchedule: true,
        practiceReminder: false,
        comments: true,
      },
    },
  };
}
