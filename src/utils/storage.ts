import {
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
import { generateWaveformSamples } from './audioGenerator.ts';

export const ROLE_PERMISSIONS: Record<Role, UserRolePermissions> = {
  leader: {
    canUploadDemo: true,
    canUploadVersion: true,
    canEditLyrics: true,
    canDeleteTracks: true,
    canSchedulePractice: true,
    canManageMembers: true,
  },
  songwriter: {
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

export const INITIAL_MEMBERS: BandMember[] = [
  {
    id: 'mem-1',
    name: 'Dave Coffin',
    stageName: 'Dave "Echo" Coffin',
    email: 'dave@bandjam.app',
    password: 'password123',
    role: 'leader',
    status: 'active',
    instrument: 'Lead Vocals & Rhythm Guitar',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Founding member, principal lyricist and rhythm player. Big fan of tape delay and 90s shoegaze.',
    gearList: '1974 Fender Telecaster Deluxe, Vox AC30, Strymon Timeline Delay, Shure SM7B',
    phone: '+1 (555) 234-8901',
    twoFactorEnabled: true,
    lastLogin: '2026-10-16T06:20:00Z',
    notifications: {
      newDemos: true,
      newVersions: true,
      lyricEdits: true,
      practiceReminders: true,
      comments: true,
    },
    isCurrentUser: true,
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'mem-2',
    name: 'Maya Lin',
    stageName: 'Maya Synthwave',
    email: 'maya@bandjam.app',
    password: 'password123',
    role: 'songwriter',
    status: 'active',
    instrument: 'Keyboards, Synth & Vocals',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    bio: 'Classical pianist turned analog synth enthusiast. Loves writing soaring melodic hooks and vocal stacks.',
    gearList: 'Roland Juno-106, Moog Grandmother, Nord Stage 3, TC Helicon VoiceLive',
    phone: '+1 (555) 876-5432',
    twoFactorEnabled: false,
    lastLogin: '2026-10-15T19:40:00Z',
    notifications: {
      newDemos: true,
      newVersions: true,
      lyricEdits: true,
      practiceReminders: true,
      comments: true,
    },
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'mem-3',
    name: 'Alex Rivers',
    stageName: 'Alex "Fuzz" Rivers',
    email: 'alex@bandjam.app',
    password: 'password123',
    role: 'songwriter',
    status: 'active',
    instrument: 'Lead Guitar',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Heavy riff sculptor and tone seeker. Obsessed with germanium fuzz pedals and pentatonic shred runs.',
    gearList: 'Gibson Les Paul Standard 50s, Marshall JCM800 50W, Klon Centaur clone, Big Muff Pi',
    phone: '+1 (555) 345-6789',
    twoFactorEnabled: false,
    lastLogin: '2026-10-14T17:30:00Z',
    notifications: {
      newDemos: true,
      newVersions: true,
      lyricEdits: false,
      practiceReminders: true,
      comments: true,
    },
    createdAt: '2024-02-10T00:00:00Z',
  },
  {
    id: 'mem-4',
    name: 'Marcus Thorne',
    stageName: 'Marcus "Low-End" Thorne',
    email: 'marcus@bandjam.app',
    password: 'password123',
    role: 'member',
    status: 'active',
    instrument: 'Bass Guitar',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    bio: 'Anchor of the rhythm section. Funk and post-punk sensibilities, pocket player.',
    gearList: 'Fender American Professional II Jazz Bass, Ampeg SVT-CL, Tech 21 SansAmp Bass Driver',
    phone: '+1 (555) 456-7890',
    twoFactorEnabled: false,
    lastLogin: '2026-10-15T08:10:00Z',
    notifications: {
      newDemos: true,
      newVersions: true,
      lyricEdits: false,
      practiceReminders: true,
      comments: true,
    },
    createdAt: '2024-03-05T00:00:00Z',
  },
  {
    id: 'mem-5',
    name: 'Sam Taylor',
    stageName: 'Sammy Beats',
    email: 'sam@bandjam.app',
    password: 'password123',
    role: 'guest',
    status: 'active',
    instrument: 'Session Drums & Percussion',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    bio: 'Touring session drummer and percussionist. Helping with pre-production and tracking.',
    gearList: 'Ludwig Classic Maple Kit, Zildjian K Custom Cymbals, Roland SPD-SX Pro',
    phone: '+1 (555) 987-6543',
    twoFactorEnabled: false,
    lastLogin: '2026-10-14T11:20:00Z',
    notifications: {
      newDemos: false,
      newVersions: false,
      lyricEdits: false,
      practiceReminders: true,
      comments: false,
    },
    createdAt: '2024-08-20T00:00:00Z',
  },
];

export const INITIAL_BAND: BandProfile = {
  id: 'band-101',
  name: 'The Midnight Echoes',
  genre: 'Indie Alternative / Dream Rock',
  motto: 'Heavy vibes, melodic hooks, late-night tape jams.',
  foundedYear: '2024',
  members: INITIAL_MEMBERS,
};

export const INITIAL_SONGS: SongIdea[] = [
  {
    id: 'song-1',
    title: 'Song Idea',
    category: 'idea',
    bpm: 118,
    musicalKey: 'E minor',
    description: 'Working acoustic demo for the opening track. Verse needs tighter vocal cadence.',
    tags: ['Acoustic', 'Verse Idea', 'Opening Track'],
    activeVersionId: 'v-1-2',
    createdAt: '2026-10-12T14:30:00Z',
    createdBy: {
      id: 'mem-1',
      name: 'Dave Coffin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    versions: [
      {
        id: 'v-1-1',
        versionNumber: 1,
        label: 'v1 - Rough Phone Voice Memo',
        audioUrl: '', // generated on init
        duration: 12,
        uploadedBy: {
          id: 'mem-1',
          name: 'Dave Coffin',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
        uploadedAt: '2026-10-12T14:30:00Z',
        notes: 'Recorded on acoustic guitar right after breakfast. Fast strumming.',
        fileSize: '1.8 MB',
        format: 'audio/wav',
        waveformSamples: generateWaveformSamples(101, 48),
      },
      {
        id: 'v-1-2',
        versionNumber: 2,
        label: 'v2 - Full Arrangement with Drums (Current)',
        audioUrl: '', // generated on init
        duration: 16,
        uploadedBy: {
          id: 'mem-1',
          name: 'Dave Coffin',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
        uploadedAt: '2026-10-14T19:15:00Z',
        notes: 'Added kick, snare pulse, and doubled rhythm strums. Much fuller feel.',
        fileSize: '2.4 MB',
        format: 'audio/wav',
        waveformSamples: generateWaveformSamples(102, 48),
      },
    ],
    lyrics: {
      draft: `[Verse 1]
Walking through the neon rain at 2 AM
Counting down the stoplights that we broke again
Shadows stretching long across the boulevard
Trying to remember how we got this far

[Chorus]
Hold the line before the signal breaks away
Everything we swallowed that we couldn't say
Turn the volume up and let the static reign
We're gonna write our names across the hurricane`,
      chordsSheet: `[Em]                [G]
Walking through the neon rain at 2 AM
[D]                 [C]
Counting down the stoplights that we broke again
[Em]                [G]
Shadows stretching long across the boulevard
[D]                 [C]
Trying to remember how we got this far

[Chorus]
[C]            [G]
Hold the line before the signal breaks away
[D]            [Em]
Everything we swallowed that we couldn't say`,
      lastEditedBy: 'Dave Coffin',
      lastEditedAt: '2026-10-14T20:00:00Z',
      versionNumber: 2,
    },
    comments: [
      {
        id: 'c-1',
        userId: 'mem-2',
        userName: 'Maya Lin',
        userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        timestampSeconds: 4,
        text: 'The transition into the chorus hits so hard here. I have a synth arpeggio ready to layer!',
        createdAt: '2026-10-14T21:10:00Z',
      },
      {
        id: 'c-2',
        userId: 'mem-4',
        userName: 'Marcus Thorne',
        userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        timestampSeconds: 8,
        text: 'Let me lock in with Sam on the eighth-note groove here.',
        createdAt: '2026-10-15T09:40:00Z',
      },
    ],
  },
  {
    id: 'song-2',
    title: 'Chorus Idea',
    category: 'chorus',
    bpm: 124,
    musicalKey: 'C Major',
    description: 'Anthemic synth chorus hook with vocal harmonies. Ready for group singalong.',
    tags: ['Chorus', 'Synth Pop', 'Hook'],
    activeVersionId: 'v-2-1',
    createdAt: '2026-10-13T11:00:00Z',
    createdBy: {
      id: 'mem-2',
      name: 'Maya Lin',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    },
    versions: [
      {
        id: 'v-2-1',
        versionNumber: 1,
        label: 'v1 - Juno Synth & Vocal Pad',
        audioUrl: '',
        duration: 14,
        uploadedBy: {
          id: 'mem-2',
          name: 'Maya Lin',
          avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        },
        uploadedAt: '2026-10-13T11:00:00Z',
        notes: 'Chords: C - G - Am - F with soaring lead line.',
        fileSize: '1.9 MB',
        format: 'audio/wav',
        waveformSamples: generateWaveformSamples(201, 48),
      },
    ],
    lyrics: {
      draft: `[Chorus]
Give me something real that doesn't fade at dawn
Play the sweetest song until the night is gone
No more looking backward, no more running cold
We are young tonight and we will not grow old`,
      chordsSheet: `[C]               [G]
Give me something real that doesn't fade at dawn
[Am]              [F]
Play the sweetest song until the night is gone`,
      lastEditedBy: 'Maya Lin',
      lastEditedAt: '2026-10-13T12:00:00Z',
      versionNumber: 1,
    },
    comments: [
      {
        id: 'c-3',
        userId: 'mem-3',
        userName: 'Alex Rivers',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        text: 'Loving this chord sequence. I will write a delay-soaked guitar lead over it.',
        createdAt: '2026-10-13T15:20:00Z',
      },
    ],
  },
  {
    id: 'song-3',
    title: 'Riff',
    category: 'riff',
    bpm: 132,
    musicalKey: 'A minor',
    description: 'Heavy fuzz rock guitar riff with tube-screamer drive. Perfect for intro and bridge breakdown.',
    tags: ['Guitar Riff', 'Heavy', 'Intro'],
    activeVersionId: 'v-3-1',
    createdAt: '2026-10-14T17:45:00Z',
    createdBy: {
      id: 'mem-3',
      name: 'Alex Rivers',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    versions: [
      {
        id: 'v-3-1',
        versionNumber: 1,
        label: 'v1 - Les Paul through Marshall 50W',
        audioUrl: '',
        duration: 12,
        uploadedBy: {
          id: 'mem-3',
          name: 'Alex Rivers',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        },
        uploadedAt: '2026-10-14T17:45:00Z',
        notes: 'A minor pentatonic run with bent 7th and aggressive palm muting.',
        fileSize: '1.7 MB',
        format: 'audio/wav',
        waveformSamples: generateWaveformSamples(301, 48),
      },
    ],
    lyrics: {
      draft: `[Instrumental Riff / Bridge Chant]
(Heavy guitar theme)
One, two, shake the room!
(Drum build-up...)`,
      lastEditedBy: 'Alex Rivers',
      lastEditedAt: '2026-10-14T18:00:00Z',
      versionNumber: 1,
    },
    comments: [],
  },
  {
    id: 'song-4',
    title: 'Bass Idea',
    category: 'bass',
    bpm: 104,
    musicalKey: 'E minor',
    description: 'Punchy walking bass line with warm sub-frequencies and rhythmic pocket groove.',
    tags: ['Bass Groove', 'Funk Rock', 'Rhythm Section'],
    activeVersionId: 'v-4-1',
    createdAt: '2026-10-15T08:15:00Z',
    createdBy: {
      id: 'mem-4',
      name: 'Marcus Thorne',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    versions: [
      {
        id: 'v-4-1',
        versionNumber: 1,
        label: 'v1 - Fender Jazz Bass direct in with SansAmp',
        audioUrl: '',
        duration: 12,
        uploadedBy: {
          id: 'mem-4',
          name: 'Marcus Thorne',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        },
        uploadedAt: '2026-10-15T08:15:00Z',
        notes: 'Low end tuned tight. Syncs right into the kick drum pocket.',
        fileSize: '1.6 MB',
        format: 'audio/wav',
        waveformSamples: generateWaveformSamples(401, 48),
      },
    ],
    lyrics: {
      draft: `[Verse Groove]
Keep your hands upon the wheel
Feel the motor start to steal
Every heartbeat through the floor
Till we don't care anymore`,
      lastEditedBy: 'Marcus Thorne',
      lastEditedAt: '2026-10-15T09:00:00Z',
      versionNumber: 1,
    },
    comments: [
      {
        id: 'c-4',
        userId: 'mem-1',
        userName: 'Dave Coffin',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        text: 'This bassline is hypnotic Marcus! Let us build verse 2 directly around this.',
        createdAt: '2026-10-15T10:15:00Z',
      },
    ],
  },
];

export const INITIAL_PRACTICES: PracticeSession[] = [
  {
    id: 'prac-1',
    title: 'Pre-Show Setlist Rehearsal',
    date: '2026-10-18',
    startTime: '19:00',
    endTime: '22:00',
    location: 'Sonic Vault Studios, Room B',
    room: 'Studio B (Marshall JCM900 & Ampeg SVT available)',
    setlistSongIds: ['song-1', 'song-2', 'song-3'],
    goals: [
      'Lock down verse-to-chorus transition on "Song Idea"',
      'Test Maya\'s synth patch balance for "Chorus Idea"',
      'Run the "Riff" breakdown twice without stopping',
    ],
    notes: 'Please arrive 15 minutes early to tune up. Dave brings extra guitar strings and PA mic cables.',
    rsvps: [
      {
        userId: 'mem-1',
        userName: 'Dave Coffin',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: 'attending',
        updatedAt: '2026-10-15T12:00:00Z',
      },
      {
        userId: 'mem-2',
        userName: 'Maya Lin',
        userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        status: 'attending',
        updatedAt: '2026-10-15T14:20:00Z',
      },
      {
        userId: 'mem-3',
        userName: 'Alex Rivers',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        status: 'attending',
        updatedAt: '2026-10-15T16:00:00Z',
      },
      {
        userId: 'mem-4',
        userName: 'Marcus Thorne',
        userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        status: 'tentative',
        updatedAt: '2026-10-16T08:00:00Z',
      },
      {
        userId: 'mem-5',
        userName: 'Sam Taylor',
        userAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
        status: 'attending',
        updatedAt: '2026-10-16T09:15:00Z',
      },
    ],
    createdBy: 'Dave Coffin',
    createdAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'prac-2',
    title: 'Writing Jam: Bass Groove & New Bridge',
    date: '2026-10-22',
    startTime: '18:30',
    endTime: '21:00',
    location: 'Alex\'s Garage Studio, East Nashville',
    room: 'Home Rehearsal space',
    setlistSongIds: ['song-4', 'song-1'],
    goals: [
      'Flesh out Marcus\'s "Bass Idea" into a full 3-minute structure',
      'Jam on lyrics drafts for the new bridge section',
    ],
    notes: 'Bring acoustic instruments and recording mics.',
    rsvps: [
      {
        userId: 'mem-1',
        userName: 'Dave Coffin',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: 'attending',
        updatedAt: '2026-10-15T12:00:00Z',
      },
      {
        userId: 'mem-4',
        userName: 'Marcus Thorne',
        userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        status: 'attending',
        updatedAt: '2026-10-16T07:30:00Z',
      },
    ],
    createdBy: 'Marcus Thorne',
    createdAt: '2026-10-15T11:00:00Z',
  },
];

const STORAGE_KEYS = {
  BAND: 'bandjam_band_profile_v1',
  SONGS: 'bandjam_songs_v1',
  PRACTICES: 'bandjam_practices_v1',
  CURRENT_USER_ID: 'bandjam_current_user_id_v1',
  AUTH_SETTINGS: 'bandjam_auth_settings_v1',
  AUDIT_LOGS: 'bandjam_audit_logs_v1',
  IS_AUTHENTICATED: 'bandjam_is_authenticated_v1',
  APP_SETTINGS: 'bandjam_app_settings_v1',
  SMTP_SETTINGS: 'bandjam_smtp_settings_v1',
  EMAIL_LOGS: 'bandjam_email_logs_v1',
};

export const INITIAL_SMTP_SETTINGS: SmtpSettings = {
  isEnabled: true,
  host: 'smtp.gmail.com',
  port: 587,
  encryption: 'tls',
  authRequired: true,
  username: 'thevelvetreverb.band@gmail.com',
  password: '',
  fromName: 'The Velvet Reverb',
  fromEmail: 'notifications@bandjam.app',
  replyTo: 'dave@bandjam.app',
  notificationTriggers: {
    newDemos: true,
    newVersions: true,
    lyricEdits: true,
    practiceSchedule: true,
    practiceReminder: true,
    comments: true,
  },
};

export const INITIAL_EMAIL_LOGS: EmailNotificationLog[] = [
  {
    id: 'eml-1',
    recipientEmail: 'maya@bandjam.app',
    recipientName: 'Maya Lin',
    subject: '[Demo Vault] New Demo Uploaded: Song Idea',
    eventType: 'new_demo',
    status: 'sent',
    sentAt: '2026-10-15T18:32:00Z',
    smtpHostUsed: 'smtp.gmail.com:587',
    htmlContent: '<div style="font-family:sans-serif;padding:24px;background:#18181b;color:#f4f4f5;border-radius:12px;max-width:540px;">' +
      '<h2 style="color:#f59e0b;margin-top:0;">🎸 New Demo Sketch Uploaded</h2>' +
      '<p>Hey <strong>Maya</strong>,</p>' +
      '<p><strong>Dave Coffin</strong> just uploaded a new demo track to the vault: <strong>Song Idea</strong>.</p>' +
      '<div style="background:#27272a;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:13px;">' +
      '<p style="margin:4px 0;"><strong>Tempo:</strong> 124 BPM</p>' +
      '<p style="margin:4px 0;"><strong>Key:</strong> E Minor</p>' +
      '<p style="margin:4px 0;"><strong>Notes:</strong> First acoustic guitar sketch with vocal melody idea.</p>' +
      '</div>' +
      '<p style="font-size:12px;color:#a1a1aa;">Sent via BandJam Notification Dispatcher</p>' +
      '</div>',
  },
  {
    id: 'eml-2',
    recipientEmail: 'alex@bandjam.app',
    recipientName: 'Alex Rivers',
    subject: '[Rehearsal] Practice Session Scheduled: Saturday Sonic Vault',
    eventType: 'practice_schedule',
    status: 'sent',
    sentAt: '2026-10-15T19:00:00Z',
    smtpHostUsed: 'smtp.gmail.com:587',
    htmlContent: '<div style="font-family:sans-serif;padding:24px;background:#18181b;color:#f4f4f5;border-radius:12px;max-width:540px;">' +
      '<h2 style="color:#10b981;margin-top:0;">📅 Band Practice Scheduled</h2>' +
      '<p>Hey <strong>Alex</strong>,</p>' +
      '<p>A new band practice has been scheduled on your calendar:</p>' +
      '<div style="background:#27272a;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:13px;">' +
      '<p style="margin:4px 0;"><strong>Date:</strong> Saturday, Oct 18, 2026</p>' +
      '<p style="margin:4px 0;"><strong>Time:</strong> 2:00 PM – 5:00 PM</p>' +
      '<p style="margin:4px 0;"><strong>Location:</strong> Sonic Vault Studios (Room B)</p>' +
      '</div>' +
      '<p>Please confirm your RSVP status in the app.</p>' +
      '</div>',
  },
  {
    id: 'eml-3',
    recipientEmail: 'marcus@bandjam.app',
    recipientName: 'Marcus Thorne',
    subject: '[Lyrics Updated] Maya Lin updated Chorus Idea chords',
    eventType: 'lyric_edit',
    status: 'sent',
    sentAt: '2026-10-16T05:15:00Z',
    smtpHostUsed: 'smtp.gmail.com:587',
    htmlContent: '<div style="font-family:sans-serif;padding:24px;background:#18181b;color:#f4f4f5;border-radius:12px;max-width:540px;">' +
      '<h2 style="color:#06b6d4;margin-top:0;">📝 Lyric & Chords Draft Updated</h2>' +
      '<p>Hey <strong>Marcus</strong>,</p>' +
      '<p><strong>Maya Lin</strong> made edits to the lyric draft and chords for <strong>Chorus Idea</strong> (v2).</p>' +
      '<p style="font-size:12px;color:#a1a1aa;">Check out the updated chord sheets in the Lyrics Studio.</p>' +
      '</div>',
  },
];

export const INITIAL_APP_SETTINGS: AppSettings = {
  primaryColor: 'amber',
  headerLogoUrl: '',
  headerLogoShape: 'rounded',
  accentGlow: true,
  headerSubtitle: 'Band Collaboration & Demo Vault',
};

export const INITIAL_AUTH_SETTINGS: AuthSettings = {
  sessionTimeoutMinutes: 120,
  allowEmailPassword: true,
  allowGoogleAuth: true,
  requireTwoFactor: false,
  minPasswordLength: 8,
  maxFailedLogins: 5,
  requireSpecialChar: true,
  lockoutDurationMinutes: 15,
};

export const INITIAL_AUDIT_LOGS: LoginAuditEntry[] = [
  {
    id: 'log-1',
    userId: 'mem-1',
    userName: 'Dave Coffin (Leader)',
    timestamp: '2026-10-16T06:20:00Z',
    ipAddress: '192.168.1.104',
    status: 'success',
    method: 'Email & Password',
    deviceInfo: 'MacBook Pro • Chrome 124 (macOS)',
  },
  {
    id: 'log-2',
    userId: 'mem-2',
    userName: 'Maya Lin',
    timestamp: '2026-10-15T19:40:00Z',
    ipAddress: '73.189.44.12',
    status: 'success',
    method: 'Google SSO',
    deviceInfo: 'iPhone 15 Pro • Mobile Safari',
  },
  {
    id: 'log-3',
    userId: 'mem-3',
    userName: 'Alex Rivers',
    timestamp: '2026-10-14T17:30:00Z',
    ipAddress: '98.240.112.5',
    status: 'success',
    method: 'Email & Password',
    deviceInfo: 'Windows 11 • Edge 122',
  },
  {
    id: 'log-4',
    userId: 'mem-4',
    userName: 'Marcus Thorne',
    timestamp: '2026-10-14T08:05:00Z',
    ipAddress: '172.56.21.90',
    status: 'failed',
    method: 'Email & Password',
    deviceInfo: 'Android 14 • Chrome Mobile (Incorrect Password)',
  },
  {
    id: 'log-5',
    userId: 'mem-4',
    userName: 'Marcus Thorne',
    timestamp: '2026-10-14T08:06:12Z',
    ipAddress: '172.56.21.90',
    status: 'success',
    method: 'Email & Password',
    deviceInfo: 'Android 14 • Chrome Mobile',
  },
];

export function loadBandProfile(): BandProfile {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BAND);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load band profile', e);
  }
  return INITIAL_BAND;
}

export function saveBandProfile(band: BandProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BAND, JSON.stringify(band));
  } catch (e) {
    console.error('Failed to save band profile', e);
  }
}

export function loadSongs(): SongIdea[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SONGS);
    if (data) {
      const parsed: SongIdea[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load songs', e);
  }
  return INITIAL_SONGS;
}

export function saveSongs(songs: SongIdea[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
  } catch (e) {
    console.error('Failed to save songs', e);
  }
}

export function loadPractices(): PracticeSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRACTICES);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load practices', e);
  }
  return INITIAL_PRACTICES;
}

export function savePractices(practices: PracticeSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRACTICES, JSON.stringify(practices));
  } catch (e) {
    console.error('Failed to save practices', e);
  }
}

export function loadCurrentUserId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (id) return id;
  } catch (e) {
    console.error('Failed to load current user', e);
  }
  return 'mem-1'; // Dave Coffin (Leader) default
}

export function saveCurrentUserId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, id);
  } catch (e) {
    console.error('Failed to save current user', e);
  }
}

export function loadAuthSettings(): AuthSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH_SETTINGS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load auth settings', e);
  }
  return INITIAL_AUTH_SETTINGS;
}

export function saveAuthSettings(settings: AuthSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save auth settings', e);
  }
}

export function loadAuditLogs(): LoginAuditEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load audit logs', e);
  }
  return INITIAL_AUDIT_LOGS;
}

export function saveAuditLogs(logs: LoginAuditEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save audit logs', e);
  }
}

export function loadIsAuthenticated(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
    if (val !== null) return val === 'true';
  } catch (e) {
    console.error('Failed to load auth state', e);
  }
  return true; // default logged in so user can jump straight in
}

export function saveIsAuthenticated(isAuth: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, isAuth ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save auth state', e);
  }
}

export function loadAppSettings(): AppSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load app settings', e);
  }
  return INITIAL_APP_SETTINGS;
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save app settings', e);
  }
}

export function loadSmtpSettings(): SmtpSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SMTP_SETTINGS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load SMTP settings', e);
  }
  return INITIAL_SMTP_SETTINGS;
}

export function saveSmtpSettings(settings: SmtpSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SMTP_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save SMTP settings', e);
  }
}

export function loadEmailLogs(): EmailNotificationLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EMAIL_LOGS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load email logs', e);
  }
  return INITIAL_EMAIL_LOGS;
}

export function saveEmailLogs(logs: EmailNotificationLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EMAIL_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save email logs', e);
  }
}

