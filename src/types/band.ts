export type Role = 'admin' | 'member' | 'guest';

export type UserStatus = 'active' | 'suspended' | 'invited';

export interface UserRolePermissions {
  canUploadDemo: boolean;
  canUploadVersion: boolean;
  canEditLyrics: boolean;
  canDeleteTracks: boolean;
  canSchedulePractice: boolean;
  canManageMembers: boolean;
}

export interface UserNotifications {
  newDemos: boolean;
  newVersions: boolean;
  lyricEdits: boolean;
  practiceReminders: boolean;
  comments: boolean;
}

export interface BandMember {
  id: string;
  name: string;
  stageName?: string;
  email: string;
  password?: string;
  role: Role;
  status: UserStatus;
  instrument: string;
  avatar: string;
  bio?: string;
  gearList?: string;
  phone?: string;
  lastLogin?: string;
  twoFactorEnabled?: boolean;
  notifications?: UserNotifications;
  appearanceSettings?: UserAppearance;
  isCurrentUser?: boolean;
  createdAt?: string;
}

export interface AudioVersion {
  id: string;
  versionNumber: number;
  label: string;
  audioUrl: string;
  duration: number; // in seconds
  uploadedBy: {
    id: string;
    name: string;
    avatar: string;
  };
  uploadedAt: string;
  notes?: string;
  fileSize?: string;
  format?: string;
  waveformSamples?: number[];
}

export interface SongComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestampSeconds?: number;
  text: string;
  createdAt: string;
}

export interface SongLyrics {
  draft: string;
  chordsSheet?: string;
  lastEditedBy: string;
  lastEditedAt: string;
  versionNumber: number;
}

export interface SongIdea {
  id: string;
  title: string;
  category: 'idea' | 'chorus' | 'riff' | 'bass' | 'full' | 'verse' | 'bridge';
  bpm?: number;
  musicalKey?: string;
  description?: string;
  tags: string[];
  activeVersionId: string;
  versions: AudioVersion[];
  lyrics: SongLyrics;
  comments: SongComment[];
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    avatar: string;
  };
}

export type SongMetadataUpdate = Pick<
  SongIdea,
  'title' | 'category' | 'bpm' | 'musicalKey' | 'description'
>;

export interface PracticeRsvp {
  userId: string;
  userName: string;
  userAvatar: string;
  status: 'attending' | 'tentative' | 'declined';
  updatedAt: string;
}

export interface PracticeSession {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  room?: string;
  setlistSongIds: string[];
  goals: string[];
  notes: string;
  eventReminderOneDay: boolean;
  eventReminderFourHours: boolean;
  rsvps: PracticeRsvp[];
  createdBy: string;
  createdAt: string;
  reminderScheduleKey?: string;
  reminderDeliveryKeys?: string[];
}

export interface BandProfile {
  id: string;
  name: string;
  genre: string;
  motto: string;
  foundedYear: string;
  members: BandMember[];
}

export interface AuthSettings {
  sessionTimeoutMinutes: number;
  allowEmailPassword: boolean;
  allowGoogleAuth: boolean;
  requireTwoFactor: boolean;
  minPasswordLength: number;
  maxFailedLogins: number;
  requireSpecialChar: boolean;
  lockoutDurationMinutes: number;
}

export interface LoginAuditEntry {
  id: string;
  userId?: string;
  userName: string;
  timestamp: string;
  ipAddress: string;
  status: 'success' | 'failed';
  method: string;
  deviceInfo: string;
}

export type ThemeColor = 'amber' | 'emerald' | 'cyan' | 'purple' | 'rose' | 'orange' | 'blue' | 'indigo' | 'teal' | 'lime' | 'pink' | 'custom';

export interface UserAppearance {
  appearance?: 'light' | 'dark' | 'system';
  radius?: 'none' | 'small' | 'medium' | 'full';
  primaryColor: ThemeColor;
  customColor?: string;
}

export interface AppSettings extends UserAppearance {
  headerLogoUrl: string;
  headerLogoShape: 'circle' | 'rounded' | 'square';
  headerSubtitle: string;
  accentGlow: boolean;
  timeFormat: '12' | '24';
}

export interface SmtpNotificationTriggers {
  newDemos: boolean;
  newVersions: boolean;
  lyricEdits: boolean;
  practiceSchedule: boolean;
  practiceReminder: boolean;
  practiceEventReminder: boolean;
  comments: boolean;
}

export interface SmtpSettings {
  isEnabled: boolean;
  host: string;
  port: number;
  encryption: 'tls' | 'ssl' | 'none';
  authRequired: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  notificationTriggers: SmtpNotificationTriggers;
}

export type EmailEventType =
  | 'member_invite'
  | 'new_demo'
  | 'new_version'
  | 'lyric_edit'
  | 'practice_schedule'
  | 'practice_reminder'
  | 'practice_event_reminder'
  | 'comment'
  | 'test_probe';

export interface MemberInvitationResult {
  status: 'sent' | 'failed';
  message: string;
  logId?: string;
}

export interface AddMemberResult {
  success: boolean;
  memberId?: string;
  invitation?: MemberInvitationResult;
}

export interface EmailNotificationLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  eventType: EmailEventType;
  status: 'sent' | 'failed' | 'simulated';
  sentAt: string;
  htmlContent: string;
  textContent?: string;
  errorMessage?: string;
  smtpHostUsed: string;
}

