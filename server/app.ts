import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { ZipArchive } from 'archiver';
import { statSync, createReadStream } from 'node:fs';
import path from 'node:path';
import {
  randomUUID,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from 'node:crypto';
import { createMediaStorage } from './media.ts';
import {
  openDatabase,
  hashPassword,
  verifyPassword,
  tokenHash,
  type DatabaseStore,
} from './database.ts';
import {
  DEFAULT_APPEARANCE,
  appearanceFrom,
  ROLE_PERMISSIONS,
  DEFAULT_AVATAR,
  type SharedState,
} from '../src/shared/defaults.ts';
import type {
  BandMember,
  EmailEventType,
  EmailNotificationLog,
  Role,
  SmtpSettings,
} from '../src/types/band.ts';
import { memberDisplayName } from '../src/shared/member.ts';
import { formatClockTime } from '../src/shared/time.ts';
import { DEFAULT_TAB_TUNING } from '../src/shared/tabs.ts';
import { categoryLabel } from '../src/shared/songMetadata.ts';
import {
  prepareEmailForDelivery,
  renderBrandedEmail,
  type EmailContent,
  type EmailDetail,
  type RenderedEmail,
} from './emailTemplates.ts';

const text = z.string().max(1e4);
const tabText = z.string().max(1e5);
const short = z.string().trim().max(200);
const required = short.min(1);
const email = z.string().trim().toLowerCase().email().max(254);
const roleSchema = z.enum(['admin', 'member', 'guest']);
const categoryIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const demoCategoriesSchema = z
  .array(
    z
      .object({ id: categoryIdSchema, label: required })
      .strict(),
  )
  .min(2)
  .max(30)
  .refine(
    (categories) => categories.filter((category) => category.id === 'all').length === 1,
    'Categories must include All Demos.',
  )
  .refine(
    (categories) =>
      categories.filter((category) => category.id === 'archived').length === 1,
    'Categories must include Archived.',
  )
  .refine(
    (categories) => new Set(categories.map((category) => category.id)).size === categories.length,
    'Category identifiers must be unique.',
  )
  .refine(
    (categories) =>
      new Set(categories.map((category) => category.label.toLowerCase())).size ===
      categories.length,
    'Category names must be unique.',
  );
const avatar = z
  .string()
  .max(5e5)
  .refine(
    (v) =>
      !v ||
      v === DEFAULT_AVATAR ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ||
      /^https:\/\//.test(v),
    'Upload a PNG, JPEG or WebP image.'
  );

const notifications = z.object({
  newDemos: z.boolean(),
  newVersions: z.boolean(),
  lyricEdits: z.boolean(),
  practiceSchedule: z.boolean(),
  practiceRsvpReminders: z.boolean(),
  practiceEventReminders: z.boolean(),
  comments: z.boolean(),
  demoArchived: z.boolean(),
});

const profileSchema = z
  .object({
    name: required,
    email,
    stageName: short,
    instrument: short,
    bio: text,
    gearList: text,
    phone: short,
    avatar,
    notifications,
  })
  .partial()
  .strict();

const authSchema = z
  .object({
    sessionTimeoutMinutes: z.number().int().min(5).max(1440),
    allowEmailPassword: z.literal(true),
    allowGoogleAuth: z.literal(false),
    requireTwoFactor: z.literal(false),
    minPasswordLength: z.number().int().min(12).max(128),
    maxFailedLogins: z.number().int().min(3).max(10),
    requireSpecialChar: z.boolean(),
    lockoutDurationMinutes: z.number().int().min(1).max(1440),
  })
  .strict();

const appearanceSchema = z
  .object({
    appearance: z.enum(['light', 'dark', 'system']),
    radius: z.enum(['none', 'small', 'medium', 'full']),
    primaryColor: z.enum([
      'amber',
      'emerald',
      'cyan',
      'purple',
      'rose',
      'orange',
      'blue',
      'indigo',
      'teal',
      'lime',
      'pink',
      'custom',
    ]),
    customColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color, such as #3b82f6.'),
  })
  .partial()
  .strict();

const appSchema = z
  .object({
    headerLogoUrl: avatar,
    headerLogoShape: z.enum(['circle', 'rounded', 'square']),
    headerSubtitle: short,
    accentGlow: z.boolean(),
    timeFormat: z.enum(['12', '24']),
    autoDeleteArchivedDemos: z.boolean(),
    demoCategories: demoCategoriesSchema,
  })
  .partial()
  .strict();

const smtpSchema = z
  .object({
    isEnabled: z.boolean(),
    host: z.string().trim().max(253).regex(/^[a-zA-Z0-9.:-]*$/),
    port: z.number().int().min(1).max(65535),
    encryption: z.enum(['tls', 'ssl', 'none']),
    authRequired: z.boolean(),
    username: short,
    password: z.string().max(1e3),
    fromName: short,
    fromEmail: z.union([email, z.literal('')]),
    replyTo: z.union([email, z.literal('')]),
    notificationTriggers: z.object({
      newDemos: z.boolean(),
      newVersions: z.boolean(),
      lyricEdits: z.boolean(),
      practiceSchedule: z.boolean(),
      practiceReminder: z.boolean(),
      practiceEventReminder: z.boolean(),
      comments: z.boolean(),
    }),
  })
  .strict();

const versionSchema = z.object({
  label: required,
  audioUrl: z.string().regex(/^\/api\/uploads\/[a-f0-9-]+$/),
  duration: z.number().finite().min(0).max(86400),
  notes: text.optional(),
  format: short.optional(),
  fileSize: short.optional(),
  waveformSamples: z.array(z.number().min(0).max(1)).max(1024).optional(),
});

const songSchema = z.object({
  title: required,
  category: categoryIdSchema,
  bpm: z.number().min(1).max(500).optional(),
  musicalKey: short.optional(),
  description: text.optional(),
  tags: z.array(short).max(50),
  lyrics: z.object({ draft: text, chordsSheet: text.optional() }).optional(),
  version: versionSchema,
});

const songMetadataSchema = z
  .object({
    songId: short,
    title: required,
    category: categoryIdSchema,
    bpm: z.number().int().min(40).max(260).optional(),
    musicalKey: short.optional(),
    description: text.optional(),
  })
  .strict();

const practiceSchema = z.object({
  title: required,
  date: (z as any).iso?.date ? (z as any).iso.date() : z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: required,
  room: short.optional(),
  setlistSongIds: z.array(short).max(500),
  goals: z.array(short).max(100),
  notes: text,
  eventReminderOneDay: z.boolean().default(true),
  eventReminderFourHours: z.boolean().default(true),
});

export const PRACTICE_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
export const PRACTICE_FINAL_REMINDER_WINDOW_MS = 4 * 60 * 60 * 1000;

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}

const legacyCategoryIds = new Set(['full', 'verse', 'bridge']);

const categoryIsAvailable = (state: SharedState, categoryId: string) =>
  categoryId !== 'all' &&
  (legacyCategoryIds.has(categoryId) ||
    state.appSettings.demoCategories.some(
      (category) => category.id === categoryId,
    ));

const requireAvailableCategory = (state: SharedState, categoryId: string) => {
  if (!categoryIsAvailable(state, categoryId)) {
    fail(400, 'Choose an available demo category.');
  }
};

const safeArchiveName = (value: string, fallback: string) =>
  value
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 120) || fallback;

const requireAdmin = (user: BandMember) => {
  if (user.role !== 'admin') fail(403, 'Admin permission required.');
};

const now = () => new Date().toISOString();

const identity = (u: BandMember) => ({
  id: u.id,
  name: memberDisplayName(u),
  avatar: u.avatar,
});

type AppNotification = Omit<EmailContent, 'greeting'> & {
  type: EmailEventType;
  subject: string;
};

const durationLabel = (duration: number) => {
  const totalSeconds = Math.max(0, Math.round(duration));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

export interface ApplicationOptions {
  development: boolean;
  mediaDirectory: string;
  databasePath: string;
  appUrl: string;
  secret: string;
  secureCookies: boolean;
  trustProxy: number;
  uploadLimitMb: number;
  adminEmail?: string;
  adminPassword?: string;
  adminName?: string;
  bandName?: string;
}

export function createApplication(options: ApplicationOptions) {
  const store = openDatabase(options.databasePath);
  const { db } = store;
  const media = createMediaStorage(
    store,
    options.mediaDirectory || path.join(path.dirname(options.databasePath), 'media')
  );
  const collectSongDeletion = (
    state: SharedState,
    target: SharedState['songs'][number],
    deletedMedia: string[],
  ) => {
    for (const version of target.versions) {
      const uploadId = version.audioUrl.split('/').pop() || '';
      const upload = db
        .prepare('SELECT relative_path FROM uploads WHERE id=?')
        .get(uploadId) as { relative_path?: string } | undefined;
      if (upload?.relative_path) deletedMedia.push(String(upload.relative_path));
      db.prepare('DELETE FROM uploads WHERE id=?').run(uploadId);
    }
    state.songs = state.songs.filter((song) => song.id !== target.id);
    for (const session of state.practices) {
      session.setlistSongIds = session.setlistSongIds.filter(
        (id) => id !== target.id,
      );
    }
  };
  const removeMediaFiles = (relativePaths: string[]) => {
    for (const relative of relativePaths) {
      try {
        media.remove(relative);
      } catch (error) {
        console.error('Could not remove deleted audio:', error);
      }
    }
  };
  const app = express();
  const origin = new URL(options.appUrl).origin;
  const key = createHash('sha256').update(options.secret).digest();

  const brandedEmail = (content: EmailContent, state = store.read()) =>
    renderBrandedEmail(
      {
        bandName: state.band.name,
        subtitle:
          state.appSettings.headerSubtitle ||
          state.band.motto ||
          "Your band's home base.",
        appUrl: origin,
        appSettings: state.appSettings,
      },
      content,
    );

  const practiceEmailDetails = (
    practice: SharedState['practices'][number],
    state: SharedState,
  ): EmailDetail[] => {
    const date = new Date(`${practice.date}T12:00:00`).toLocaleDateString(
      undefined,
      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    );
    const setlist = practice.setlistSongIds
      .map((songId) => state.songs.find((song) => song.id === songId)?.title)
      .filter((title): title is string => Boolean(title));
    return [
      { label: 'Date', value: date },
      {
        label: 'Time',
        value: `${formatClockTime(practice.startTime, state.appSettings.timeFormat)} – ${formatClockTime(practice.endTime, state.appSettings.timeFormat)}`,
      },
      { label: 'Location', value: practice.location },
      { label: 'Room', value: practice.room || '' },
      { label: 'Setlist', value: setlist.join('\n') },
      { label: 'Goals', value: practice.goals.join('\n') },
      { label: 'Notes', value: practice.notes },
    ];
  };

  const route =
    (handler: (req: Request, res: Response) => Promise<any> | any) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve()
        .then(() => handler(req, res))
        .catch(next);
    };

  function encrypt(value: string): string {
    if (!value) return '';
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [
      iv.toString('hex'),
      cipher.getAuthTag().toString('hex'),
      data.toString('hex'),
    ].join(':');
  }

  function decrypt(value: string): string {
    if (!value) return '';
    const [iv, tag, data] = value.split(':');
    if (!iv || !tag || !data) return '';
    const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    cipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([
      cipher.update(Buffer.from(data, 'hex')),
      cipher.final(),
    ]).toString('utf8');
  }

  const validatePassword = (password: string, state = store.read()) => {
    z.string().min(state.authSettings.minPasswordLength).max(128).parse(password);
    if (state.authSettings.requireSpecialChar && !/[^a-zA-Z0-9\s]/.test(password)) {
      fail(400, 'Password must contain a special character.');
    }
  };

  if (!store.members().length) {
    if (!options.adminEmail || !options.adminPassword) {
      fail(
        500,
        'Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD before first startup.'
      );
    }
    const adminEmail = email.parse(options.adminEmail);
    validatePassword(options.adminPassword);
    store.transaction(() => {
      store.saveUser(
        {
          id: randomUUID(),
          name: options.adminName || 'Band Admin',
          email: adminEmail,
          role: 'admin',
          status: 'active',
          instrument: '',
          avatar: DEFAULT_AVATAR,
          createdAt: now(),
        },
        hashPassword(options.adminPassword!)
      );
      const state = store.read();
      state.band.name = options.bandName || 'RehearsalHQ';
      store.write(state);
    });
  }

  const dummyHash = hashPassword(randomBytes(32).toString('hex'));

  app.disable('x-powered-by');
  if (options.trustProxy) app.set('trust proxy', options.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: options.development
        ? false
        : {
            directives: {
              'img-src': ["'self'", 'data:', 'https:'],
              'media-src': ["'self'", 'blob:'],
              'connect-src': ["'self'", 'blob:'],
              'style-src': ["'self'", "'unsafe-inline'"],
              'script-src': ["'self'"],
              'upgrade-insecure-requests': options.secureCookies ? [] : null,
            },
          },
      strictTransportSecurity: options.secureCookies ? undefined : false,
    })
  );

  app.get('/api/health', (_req: Request, res: Response) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  });

  const CURRENT_APP_VERSION = '1.0.4';
  const GITHUB_REPO = 'dcoffin88/RehearsalHQ';
  let cachedVersionCheck: {
    data: any;
    timestamp: number;
  } | null = null;

  function compareSemver(v1: string, v2: string): number {
    const clean = (v: string) =>
      (v || '')
        .trim()
        .replace(/^v/i, '')
        .split('-')[0]
        .split('.')
        .map((n) => parseInt(n, 10) || 0);

    const parts1 = clean(v1);
    const parts2 = clean(v2);
    const maxLen = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLen; i++) {
      const p1 = parts1[i] ?? 0;
      const p2 = parts2[i] ?? 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  app.get(
    '/api/version/check',
    route(async (_req: Request, res: Response) => {
      const nowMs = Date.now();
      if (cachedVersionCheck && nowMs - cachedVersionCheck.timestamp < 300_000) {
        return res.json(cachedVersionCheck.data);
      }
      try {
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
          {
            headers: {
              'User-Agent': 'RehearsalHQ-VersionCheck',
              Accept: 'application/vnd.github.v3+json',
            },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (!response.ok) {
          throw new Error(`GitHub API returned status ${response.status}`);
        }
        const release = (await response.json()) as any;
        const latestTag = String(release.tag_name || release.name || '').trim();
        const latestVersion = latestTag.replace(/^v/i, '') || CURRENT_APP_VERSION;
        const updateAvailable = compareSemver(latestVersion, CURRENT_APP_VERSION) > 0;
        const data = {
          currentVersion: CURRENT_APP_VERSION,
          latestVersion,
          latestTag: latestTag || `v${latestVersion}`,
          updateAvailable,
          releaseName: release.name || latestTag || `RehearsalHQ v${latestVersion}`,
          releaseUrl:
            release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
          publishedAt: release.published_at || release.created_at || null,
          body: (release.body || '').slice(0, 1000),
          checkedAt: new Date().toISOString(),
          repoUrl: `https://github.com/${GITHUB_REPO}`,
        };
        cachedVersionCheck = { data, timestamp: nowMs };
        res.json(data);
      } catch (err: any) {
        const fallback = cachedVersionCheck?.data || {
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: CURRENT_APP_VERSION,
          latestTag: `v${CURRENT_APP_VERSION}`,
          updateAvailable: false,
          releaseName: `RehearsalHQ v${CURRENT_APP_VERSION}`,
          releaseUrl: `https://github.com/${GITHUB_REPO}/releases/latest`,
          publishedAt: null,
          body: '',
          checkedAt: new Date().toISOString(),
          repoUrl: `https://github.com/${GITHUB_REPO}`,
          error: err?.message || 'Could not reach GitHub',
        };
        res.json(fallback);
      }
    })
  );

  app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use('/api', (req: Request, _res: Response, next: NextFunction) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('origin') && req.get('origin') !== origin) {
        return next(new HttpError(403, 'Request origin is not allowed.'));
      }
      if (
        req.get('sec-fetch-site') === 'cross-site' ||
        req.get('x-rehearsalhq-request') !== '1'
      ) {
        return next(new HttpError(403, 'Missing request protection header.'));
      }
    }
    next();
  });

  app.use(
    '/api',
    rateLimit({
      windowMs: 6e4,
      limit: 240,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Too many requests. Try again shortly.' },
    })
  );

  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 6e4,
      limit: 20,
      skip: (req) => req.method === 'GET',
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Too many sign-in attempts. Try again shortly.' },
    })
  );

  app.use(express.json({ limit: '2mb' }));

  const cookieName = 'rehearsalhq_session';
  const cookies = (req: Request): Record<string, string> =>
    Object.fromEntries(
      (req.get('cookie') || '')
        .split(';')
        .filter((v) => v.includes('='))
        .map((v) => {
          const i = v.indexOf('=');
          return [v.slice(0, i).trim(), v.slice(i + 1)];
        })
    );

  const token = (req: Request) => cookies(req)[cookieName] || '';

  function authenticate(req: Request): BandMember {
    const session = db
      .prepare('SELECT user_id,expires_at FROM sessions WHERE token_hash=?')
      .get(tokenHash(token(req))) as { user_id: string; expires_at: number } | undefined;
    if (!session || Number(session.expires_at) <= Date.now()) {
      fail(401, 'Please sign in.');
    }
    const user = store.members().find((u) => u.id === session.user_id);
    if (!user || user.status !== 'active') {
      fail(401, 'Please sign in with an active account.');
    }
    return user;
  }

  function createSession(user: BandMember, res: Response) {
    const value = randomBytes(32).toString('hex');
    const maxAge = store.read().authSettings.sessionTimeoutMinutes * 6e4;
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(
      tokenHash(value),
      user.id,
      Date.now() + maxAge
    );
    res.cookie(cookieName, value, {
      httpOnly: true,
      secure: options.secureCookies,
      sameSite: 'strict',
      path: '/',
      maxAge,
    });
  }

  function snapshot(user: BandMember) {
    const state = store.read();
    const isAdmin = user.role === 'admin';
    return {
      ...state,
      appSettings: {
        ...state.appSettings,
        ...DEFAULT_APPEARANCE,
        ...user.appearanceSettings,
        accentGlow: state.appSettings.accentGlow,
      },
      smtpSettings: isAdmin
        ? { ...state.smtpSettings, password: '' }
        : {
            ...state.smtpSettings,
            host: '',
            username: '',
            password: '',
            fromEmail: '',
            replyTo: '',
          },
      auditLogs: isAdmin ? state.auditLogs : [],
      emailLogs: isAdmin ? state.emailLogs : [],
      band: {
        ...state.band,
        members: state.band.members.map((m) =>
          m.id === user.id || isAdmin
            ? m
            : {
                ...m,
                email: '',
                phone: undefined,
                notifications: undefined,
                appearanceSettings: undefined,
              }
        ),
      },
      currentUser: user,
      permissions: ROLE_PERMISSIONS[user.role],
    };
  }

  app.get(
    '/api/auth/session',
    route((req: Request, res: Response) => {
      try {
        res.json(snapshot(authenticate(req)));
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 401) throw error;
        const { band, appSettings } = store.read();
        res.json({
          currentUser: null,
          bandName: band.name,
          appSettings: {
            headerLogoUrl: appSettings.headerLogoUrl,
            headerLogoShape: appSettings.headerLogoShape,
            headerSubtitle: appSettings.headerSubtitle,
            timeFormat: appSettings.timeFormat,
            ...DEFAULT_APPEARANCE,
          },
        });
      }
    })
  );

  function audit(
    req: Request,
    userName: string,
    success: boolean,
    userId?: string
  ) {
    const state = store.read();
    state.auditLogs.unshift({
      id: randomUUID(),
      userId,
      userName,
      timestamp: now(),
      ipAddress: req.ip || '',
      status: success ? 'success' : 'failed',
      method: 'Email & Password',
      deviceInfo: (req.get('user-agent') || '').slice(0, 200),
    });
    state.auditLogs = state.auditLogs.slice(0, 1e3);
    store.write(state);
  }

  app.post(
    '/api/auth/login',
    route((req: Request, res: Response) => {
      const input = z
        .object({ email, password: z.string().min(1).max(128) })
        .parse(req.body);
      const state = store.read();
      const attempts = db
        .prepare('SELECT * FROM login_attempts WHERE email=?')
        .get(input.email) as { failures: number; locked_until: number } | undefined;
      if (attempts && Number(attempts.locked_until) > Date.now()) {
        fail(429, 'Account temporarily locked. Try again later.');
      }
      const row = db
        .prepare('SELECT id,password_hash FROM users WHERE email=?')
        .get(input.email) as { id: string; password_hash: string } | undefined;
      const correct = verifyPassword(
        input.password,
        row ? String(row.password_hash) : dummyHash
      );
      const user = row && state.band.members.find((u) => u.id === row.id);
      if (!correct || !user || user.status === 'suspended') {
        const failures =
          attempts && Number(attempts.locked_until) === 0
            ? Number(attempts.failures) + 1
            : 1;
        const lockedUntil =
          failures >= state.authSettings.maxFailedLogins
            ? Date.now() + state.authSettings.lockoutDurationMinutes * 6e4
            : 0;
        db.prepare(
          'INSERT INTO login_attempts VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until'
        ).run(input.email, failures, lockedUntil);
        audit(req, input.email, false);
        fail(401, 'Invalid email or password.');
      }
      user.status = 'active';
      user.lastLogin = now();
      store.saveUser(user);
      db.prepare('DELETE FROM login_attempts WHERE email=?').run(input.email);
      audit(req, memberDisplayName(user), true, user.id);
      createSession(user, res);
      res.json(snapshot(user));
    })
  );

  app.post(
    '/api/auth/logout',
    route((req: Request, res: Response) => {
      db.prepare('DELETE FROM sessions WHERE token_hash=?').run(
        tokenHash(token(req))
      );
      res.clearCookie(cookieName, {
        path: '/',
        httpOnly: true,
        secure: options.secureCookies,
        sameSite: 'strict',
      });
      res.json({ success: true });
    })
  );

  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.locals.user = authenticate(req);
      next();
    } catch (error) {
      next(error);
    }
  });

  app.get(
    '/api/state',
    route((_req: Request, res: Response) => res.json(snapshot(res.locals.user)))
  );

  app.post(
    '/api/auth/password',
    route((req: Request, res: Response) => {
      const user = res.locals.user as BandMember;
      const input = z
        .object({
          currentPassword: z.string().max(128),
          newPassword: z.string().max(128),
        })
        .parse(req.body);
      const row = db
        .prepare('SELECT password_hash FROM users WHERE id=?')
        .get(user.id) as { password_hash: string } | undefined;
      if (!row || !verifyPassword(input.currentPassword, String(row.password_hash))) {
        fail(400, 'Current password does not match.');
      }
      validatePassword(input.newPassword);
      store.transaction(() => {
        store.saveUser(user, hashPassword(input.newPassword));
        db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
      });
      createSession(user, res);
      res.json({ success: true });
    })
  );

  app.post(
    '/api/uploads',
    express.raw({
      type: () => true,
      limit: `${options.uploadLimitMb || 100}mb`,
    }),
    route((req: Request, res: Response) => {
      const user = res.locals.user as BandMember;
      if (!ROLE_PERMISSIONS[user.role].canUploadDemo) {
        fail(403, 'Upload permission required.');
      }
      const mime = (req.get('content-type') || '').split(';')[0];
      if (
        !/^audio\/[a-zA-Z0-9.+-]+$/.test(mime) ||
        !Buffer.isBuffer(req.body) ||
        !req.body.length
      ) {
        fail(400, 'Choose a non-empty audio file.');
      }
      const id = randomUUID();
      const category = categoryIdSchema.parse(req.query.category || 'idea');
      requireAvailableCategory(store.read(), category);
      const relative = media.location(user.name, category, id, mime);
      media.write(relative, req.body);
      try {
        db.prepare(
          "INSERT INTO uploads (id,owner_id,mime,data,created_at,relative_path) VALUES (?,?,?,X'',?,?)"
        ).run(id, user.id, mime, Date.now(), relative);
      } catch (error) {
        media.remove(relative);
        throw error;
      }
      res.status(201).json({ audioUrl: `/api/uploads/${id}` });
    })
  );

  app.get(
    '/api/demos/:songId/export',
    route((req: Request, res: Response) => {
      const state = store.read();
      const song = state.songs.find(
        (candidate) => candidate.id === String(req.params.songId),
      );
      if (!song) fail(404, 'Demo not found.');

      const folderName = safeArchiveName(song.title, 'Demo');
      const archiveName = `${folderName}.zip`;
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${archiveName.replaceAll('"', '')}"; filename*=UTF-8''${encodeURIComponent(archiveName)}`,
        'Cache-Control': 'private, no-store',
      });

      const archive = new ZipArchive({ zlib: { level: 6 } });
      archive.on('warning', (error) => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          res.destroy(error);
        }
      });
      archive.on('error', (error) => res.destroy(error));
      archive.pipe(res);

      song.versions.forEach((version, index) => {
        const uploadId = version.audioUrl.split('/').pop() || '';
        const row = db
          .prepare('SELECT relative_path FROM uploads WHERE id=?')
          .get(uploadId) as { relative_path?: string } | undefined;
        if (!row?.relative_path || !media.exists(row.relative_path)) return;
        const extension = path.extname(row.relative_path).toLowerCase() || '.audio';
        const versionName = safeArchiveName(
          version.label || `Version ${index + 1}`,
          `Version_${index + 1}`,
        );
        archive.file(media.resolve(row.relative_path), {
          name: `${folderName}/Audio/${String(index + 1).padStart(2, '0')}_${versionName}${extension}`,
        });
      });

      archive.append(song.lyrics?.draft || '', {
        name: `${folderName}/Lyrics.txt`,
      });
      archive.append(song.lyrics?.chordsSheet || '', {
        name: `${folderName}/Chords.txt`,
      });
      const tabsContent = song.tabs?.content || '';
      const tabsDocument = song.tabs?.tuning
        ? `Tuning: ${song.tabs.tuning}\n\n${tabsContent}`
        : tabsContent;
      archive.append(tabsDocument, { name: `${folderName}/Tabs.txt` });
      void archive.finalize();
    }),
  );

  app.get(
    '/api/uploads/:id',
    route((req: Request, res: Response) => {
      const row = db
        .prepare('SELECT mime,relative_path FROM uploads WHERE id=?')
        .get(String(req.params.id)) as
        | { mime: string; relative_path: string }
        | undefined;
      if (!row) fail(404, 'Audio not found.');
      const relative = String(row.relative_path);
      if (!media.exists(relative)) {
        fail(404, 'Audio file is missing from the media mount.');
      }
      const filename = media.resolve(relative);
      const size = statSync(filename).size;
      const stream = (start2: number, end: number) =>
        createReadStream(filename, { start: start2, end })
          .on('error', (error) => res.destroy(error))
          .pipe(res);
      res.set({
        'Content-Type': String(row.mime),
        'Accept-Ranges': 'bytes',
        'Content-Disposition': 'inline',
      });
      const range = req.get('range');
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2])) {
          return res.status(416).set('Content-Range', `bytes */${size}`).end();
        }
        const start2 = match[1]
          ? Number(match[1])
          : Math.max(0, size - Number(match[2]));
        const end =
          match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
        if (
          !Number.isSafeInteger(start2) ||
          !Number.isSafeInteger(end) ||
          start2 < 0 ||
          start2 >= size ||
          end < start2
        ) {
          return res.status(416).set('Content-Range', `bytes */${size}`).end();
        }
        res.status(206).set({
          'Content-Range': `bytes ${start2}-${end}/${size}`,
          'Content-Length': String(end - start2 + 1),
        });
        return stream(start2, end);
      }
      res.set('Content-Length', String(size));
      stream(0, size - 1);
    })
  );

  function ensureVersion(url2: string, user: BandMember) {
    const uploadId = url2.split('/').pop() || '';
    const row = db
      .prepare('SELECT owner_id FROM uploads WHERE id=?')
      .get(uploadId) as { owner_id: string } | undefined;
    if (!row || row.owner_id !== user.id) {
      fail(400, 'Upload this audio file before saving the take.');
    }
    if (
      store
        .read()
        .songs.some((song) =>
          song.versions.some((version) => version.audioUrl === url2)
        )
    ) {
      fail(400, 'This upload is already attached to a take.');
    }
  }

  function protectLastAdmin(user: BandMember, replacement?: BandMember) {
    if (
      user.role === 'admin' &&
      user.status === 'active' &&
      (!replacement ||
        replacement.role !== 'admin' ||
        replacement.status !== 'active') &&
      store
        .members()
        .filter((u) => u.role === 'admin' && u.status === 'active').length <= 1
    ) {
      fail(400, 'Keep at least one active Admin account.');
    }
  }

  app.post(
    '/api/actions',
    route(async (req: Request, res: Response) => {
      const user = res.locals.user as BandMember;
      const { action, payload: p } = z
        .object({
          action: required,
          payload: z.record(z.string(), z.unknown()).default({}),
        })
        .parse(req.body);
      let result: any;
      let invitationRecipient: BandMember | undefined;
      const deletedMedia: string[] = [];
      let event: AppNotification | undefined;

      store.transaction(() => {
        const state = store.read();
        const permissions = ROLE_PERMISSIONS[user.role];
        const member = () =>
          state.band.members.find((u) => u.id === (p.userId as string)) ||
          fail(404, 'Member not found.');
        const song = () =>
          state.songs.find((s) => s.id === (p.songId as string)) ||
          fail(404, 'Song not found.');
        const requireEditableSong = (target: ReturnType<typeof song>) => {
          if (target.category === 'archived') {
            fail(400, 'Restore this archived demo before editing it.');
          }
        };
        const practice = () =>
          state.practices.find((s) => s.id === (p.practiceId as string)) ||
          fail(404, 'Practice not found.');

        switch (action) {
          case 'band.update': {
            requireAdmin(user);
            const data = z
              .object({
                name: required,
                motto: short.optional(),
                genre: short.optional(),
                foundedYear: short.optional(),
              })
              .strict()
              .parse(p);
            state.band = { ...state.band, ...data };
            break;
          }
          case 'app.update':
            requireAdmin(user);
            state.appSettings = { ...state.appSettings, ...appSchema.parse(p) };
            break;
          case 'appearance.update': {
            const appearanceSettings = appearanceFrom({
              ...DEFAULT_APPEARANCE,
              ...user.appearanceSettings,
              ...appearanceSchema.parse(p),
            });
            if (
              appearanceSettings.primaryColor === 'custom' &&
              !appearanceSettings.customColor
            ) {
              fail(400, 'Choose a custom color before saving.');
            }
            store.saveUser({ ...user, appearanceSettings });
            break;
          }
          case 'auth.update':
            requireAdmin(user);
            state.authSettings = authSchema.parse(p);
            break;
          case 'smtp.update': {
            requireAdmin(user);
            const data = smtpSchema.parse(p);
            state.smtpSettings = {
              ...data,
              password: data.password
                ? encrypt(data.password)
                : state.smtpSettings.password,
            };
            break;
          }
          case 'audit.clear':
            requireAdmin(user);
            state.auditLogs = [];
            break;
          case 'email.clear':
            requireAdmin(user);
            state.emailLogs = [];
            break;
          case 'member.add': {
            requireAdmin(user);
            const data = z
              .object({
                name: required,
                email,
                password: z.string().max(128),
                role: roleSchema,
                instrument: short.default(''),
                avatar: avatar.optional(),
              })
              .parse(p);
            validatePassword(data.password, state);
            if (state.band.members.some((u) => u.email === data.email)) {
              fail(409, 'Email address already exists.');
            }
            const { password, ...fields } = data;
            const newMember: BandMember = {
              ...fields,
              id: randomUUID(),
              avatar: fields.avatar || DEFAULT_AVATAR,
              status: 'active',
              createdAt: now(),
            };
            store.saveUser(newMember, hashPassword(password));
            invitationRecipient = newMember;
            result = { memberId: newMember.id };
            break;
          }
          case 'member.invite': {
            requireAdmin(user);
            const target = member();
            if (target.status === 'suspended') {
              fail(400, 'Activate this account before sending an invitation.');
            }
            invitationRecipient = target;
            result = { memberId: target.id };
            break;
          }
          case 'member.profile': {
            const target = member();
            if (target.id !== user.id) requireAdmin(user);
            const updates = profileSchema.parse(p.updates);
            if (
              updates.email &&
              state.band.members.some(
                (u) => u.id !== target.id && u.email === updates.email
              )
            ) {
              fail(409, 'Email address already exists.');
            }
            store.saveUser({ ...target, ...updates });
            break;
          }
          case 'member.password': {
            requireAdmin(user);
            const target = member();
            const password = z.string().max(128).parse(p.password);
            validatePassword(password, state);
            store.saveUser(target, hashPassword(password));
            db.prepare('DELETE FROM sessions WHERE user_id=?').run(target.id);
            break;
          }
          case 'member.role':
          case 'member.status': {
            requireAdmin(user);
            const target = member();
            const updated = { ...target };
            if (action === 'member.role') {
              updated.role = roleSchema.parse(p.role);
            } else {
              updated.status = z
                .enum(['active', 'suspended', 'invited'])
                .parse(p.status);
            }
            protectLastAdmin(target, updated);
            store.saveUser(updated);
            db.prepare('DELETE FROM sessions WHERE user_id=?').run(target.id);
            break;
          }
          case 'member.delete': {
            requireAdmin(user);
            const target = member();
            protectLastAdmin(target);
            db.prepare('DELETE FROM users WHERE id=?').run(target.id);
            break;
          }
          case 'song.add': {
            if (!permissions.canUploadDemo) {
              fail(403, 'Upload permission required.');
            }
            const data = songSchema.parse(p);
            requireAvailableCategory(state, data.category);
            ensureVersion(data.version.audioUrl, user);
            const version = {
              ...data.version,
              id: randomUUID(),
              versionNumber: 1,
              uploadedBy: identity(user),
              uploadedAt: now(),
            };
            const { version: _v, ...fields } = data;
            result = {
              ...fields,
              id: randomUUID(),
              versions: [version],
              activeVersionId: version.id,
              lyrics: {
                draft: data.lyrics?.draft || '',
                chordsSheet: data.lyrics?.chordsSheet || '',
                lastEditedBy: memberDisplayName(user),
                lastEditedAt: now(),
                versionNumber: 1,
              },
              tabs: {
                tuning: DEFAULT_TAB_TUNING,
                content: '',
                lastEditedBy: memberDisplayName(user),
                lastEditedAt: now(),
                versionNumber: 0,
              },
              comments: [],
              createdAt: now(),
              createdBy: identity(user),
            };
            state.songs.unshift(result);
            event = {
              type: 'new_demo',
              subject: `New demo: ${data.title}`,
              preheader: `${memberDisplayName(user)} uploaded a new demo for the band.`,
              eyebrow: 'New demo uploaded',
              title: data.title,
              intro: `${memberDisplayName(user)} added a new recording to the demo vault.`,
              details: [
                {
                  label: 'Category',
                  value: categoryLabel(
                    state.appSettings.demoCategories,
                    data.category,
                  ),
                },
                { label: 'Tempo', value: data.bpm ? `${data.bpm} BPM` : '' },
                { label: 'Key', value: data.musicalKey || '' },
                { label: 'Initial take', value: version.label },
                { label: 'Uploaded by', value: memberDisplayName(user) },
              ],
              callout: data.description
                ? { label: 'Notes for the band', text: data.description }
                : undefined,
              ctaLabel: 'Listen in RehearsalHQ',
            };
            break;
          }
          case 'song.version': {
            if (!permissions.canUploadVersion) {
              fail(403, 'Upload permission required.');
            }
            const target = song();
            requireEditableSong(target);
            const data = versionSchema.parse(p.version);
            ensureVersion(data.audioUrl, user);
            const version = {
              ...data,
              id: randomUUID(),
              versionNumber: target.versions.length + 1,
              uploadedBy: identity(user),
              uploadedAt: now(),
            };
            target.versions.push(version);
            target.activeVersionId = version.id;
            event = {
              type: 'new_version',
              subject: `New take: ${target.title}`,
              preheader: `${memberDisplayName(user)} uploaded ${version.label}.`,
              eyebrow: 'New recording take',
              title: target.title,
              intro: `${memberDisplayName(user)} uploaded a new take and made it the active version.`,
              details: [
                { label: 'Take', value: version.label },
                { label: 'Version', value: `v${version.versionNumber}` },
                {
                  label: 'Duration',
                  value: durationLabel(version.duration),
                },
                { label: 'File size', value: version.fileSize || '' },
                { label: 'Uploaded by', value: memberDisplayName(user) },
              ],
              callout: version.notes
                ? { label: 'Take notes', text: version.notes }
                : undefined,
              ctaLabel: 'Listen to the new take',
            };
            break;
          }
          case 'song.update': {
            if (!permissions.canUploadDemo) {
              fail(403, 'Editing permission required.');
            }
            const data = songMetadataSchema.parse(p);
            const target = song();
            requireEditableSong(target);
            requireAvailableCategory(state, data.category);
            target.title = data.title;
            target.category = data.category;
            target.bpm = data.bpm;
            target.musicalKey = data.musicalKey;
            target.description = data.description;
            break;
          }
          case 'song.lyrics': {
            if (!permissions.canEditLyrics) {
              fail(403, 'Editing permission required.');
            }
            const target = song();
            requireEditableSong(target);
            target.lyrics = {
              draft: text.parse(p.draft),
              chordsSheet:
                p.chordsSheet === undefined
                  ? target.lyrics.chordsSheet
                  : text.parse(p.chordsSheet),
              lastEditedBy: memberDisplayName(user),
              lastEditedAt: now(),
              versionNumber: target.lyrics.versionNumber + 1,
            };
            event = {
              type: 'lyric_edit',
              subject: `Lyrics updated: ${target.title}`,
              preheader: `${memberDisplayName(user)} updated the lyrics.`,
              eyebrow: 'Lyrics updated',
              title: target.title,
              intro: `${memberDisplayName(user)} saved a new lyrics revision.`,
              details: [
                { label: 'Revision', value: `Version ${target.lyrics.versionNumber}` },
                { label: 'Edited by', value: memberDisplayName(user) },
              ],
              ctaLabel: 'Review lyrics',
            };
            break;
          }
          case 'song.chords': {
            if (!permissions.canEditLyrics) {
              fail(403, 'Editing permission required.');
            }
            const target = song();
            requireEditableSong(target);
            const lyricsDraft = target.lyrics.draft.trim();
            if (
              !lyricsDraft ||
              /^\[Draft Lyrics for .+\]\s*\(Add lyrics here\.\.\.\)$/s.test(
                lyricsDraft,
              )
            ) {
              fail(400, 'Add lyrics in Lyrics Studio before creating a chord chart.');
            }
            target.lyrics = {
              ...target.lyrics,
              chordsSheet: text.parse(p.chordsSheet),
              lastEditedBy: memberDisplayName(user),
              lastEditedAt: now(),
              versionNumber: target.lyrics.versionNumber + 1,
            };
            event = {
              type: 'lyric_edit',
              subject: `Chord chart updated: ${target.title}`,
              preheader: `${memberDisplayName(user)} updated the chord chart.`,
              eyebrow: 'Chord chart updated',
              title: target.title,
              intro: `${memberDisplayName(user)} saved a new chord chart revision.`,
              details: [
                { label: 'Revision', value: `Version ${target.lyrics.versionNumber}` },
                { label: 'Edited by', value: memberDisplayName(user) },
              ],
              ctaLabel: 'Review chord chart',
            };
            break;
          }
          case 'song.tabs': {
            if (!permissions.canEditLyrics) {
              fail(403, 'Editing permission required.');
            }
            const target = song();
            requireEditableSong(target);
            const data = z
              .object({
                songId: short,
                tuning: z.string().trim().max(100),
                content: tabText,
              })
              .strict()
              .parse(p);
            target.tabs = {
              tuning: data.tuning,
              content: data.content,
              lastEditedBy: memberDisplayName(user),
              lastEditedAt: now(),
              versionNumber: (target.tabs?.versionNumber || 0) + 1,
            };
            break;
          }
          case 'song.comment': {
            const target = song();
            requireEditableSong(target);
            const comment = {
              id: randomUUID(),
              userId: user.id,
              userName: memberDisplayName(user),
              userAvatar: user.avatar,
              text: text.min(1).parse(p.text),
              timestampSeconds:
                p.timestampSeconds === undefined
                  ? undefined
                  : z.number().min(0).parse(p.timestampSeconds),
              createdAt: now(),
            };
            target.comments.push(comment);
            event = {
              type: 'comment',
              subject: `New comment: ${target.title}`,
              preheader: `${memberDisplayName(user)} left feedback on ${target.title}.`,
              eyebrow: 'New band feedback',
              title: target.title,
              intro: `${memberDisplayName(user)} added a comment to this recording.`,
              details: [
                { label: 'Commented by', value: memberDisplayName(user) },
                {
                  label: 'At recording time',
                  value:
                    comment.timestampSeconds === undefined
                      ? ''
                      : `${Math.floor(comment.timestampSeconds / 60)}:${String(comment.timestampSeconds % 60).padStart(2, '0')}`,
                },
              ],
              callout: { label: 'Comment', text: comment.text },
              ctaLabel: 'Open the discussion',
            };
            break;
          }
          case 'song.active': {
            const target = song();
            requireEditableSong(target);
            if (!permissions.canUploadVersion) {
              fail(403, 'Editing permission required.');
            }
            if (!target.versions.some((v) => v.id === p.versionId)) {
              fail(404, 'Version not found.');
            }
            target.activeVersionId = String(p.versionId);
            break;
          }
          case 'song.archive': {
            requireAdmin(user);
            const target = song();
            if (target.category !== 'archived') {
              target.archivedFromCategory = target.category;
              target.category = 'archived';
              target.archivedAt = now();
              const autoDelete = state.appSettings.autoDeleteArchivedDemos;
              const deletionDate = new Date(
                Date.parse(target.archivedAt) + 30 * 24 * 60 * 60 * 1000,
              ).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC',
              });
              event = {
                type: 'demo_archived',
                subject: `Demo archived: ${target.title}`,
                preheader: autoDelete
                  ? `${target.title} was archived and will be permanently deleted in 30 days.`
                  : `${target.title} was moved to Archived.`,
                eyebrow: 'Demo archived',
                title: target.title,
                intro: `${memberDisplayName(user)} moved this demo to Archived. Its audio, lyrics, chords, tabs, and comments are now read-only.`,
                details: [
                  { label: 'Archived by', value: memberDisplayName(user) },
                  {
                    label: 'Previous category',
                    value: categoryLabel(
                      state.appSettings.demoCategories,
                      target.archivedFromCategory,
                    ),
                  },
                  {
                    label: autoDelete ? 'Scheduled deletion' : 'Automatic deletion',
                    value: autoDelete ? deletionDate : 'Disabled',
                  },
                ],
                callout: autoDelete
                  ? {
                      label: '30-day deletion notice',
                      text: 'This item will be permanently deleted in 30 days. Download its ZIP archive before deletion if you want to keep the audio takes, lyrics, chords, and tabs for your own records.',
                    }
                  : undefined,
                ctaLabel: 'Open Archived Demos',
              };
            }
            break;
          }
          case 'song.restore': {
            requireAdmin(user);
            const target = song();
            if (target.category !== 'archived') {
              fail(400, 'Only archived demos can be restored.');
            }
            const previousCategory = target.archivedFromCategory;
            const fallbackCategory =
              state.appSettings.demoCategories.find(
                (category) =>
                  category.id !== 'all' && category.id !== 'archived',
              )?.id || 'idea';
            target.category =
              previousCategory &&
              previousCategory !== 'all' &&
              previousCategory !== 'archived' &&
              state.appSettings.demoCategories.some(
                (category) => category.id === previousCategory,
              )
                ? previousCategory
                : fallbackCategory;
            delete target.archivedFromCategory;
            delete target.archivedAt;
            break;
          }
          case 'song.delete': {
            requireAdmin(user);
            const target = song();
            collectSongDeletion(state, target, deletedMedia);
            break;
          }
          case 'practice.add': {
            if (!permissions.canSchedulePractice) {
              fail(403, 'Scheduling permission required.');
            }
            const data = practiceSchema.parse(p);
            if (data.endTime <= data.startTime) {
              fail(400, 'Practice must end after it starts.');
            }
            state.practices.unshift({
              ...data,
              id: randomUUID(),
              rsvps: [
                {
                  userId: user.id,
                  userName: memberDisplayName(user),
                  userAvatar: user.avatar,
                  status: 'attending',
                  updatedAt: now(),
                },
              ],
              createdBy: memberDisplayName(user),
              createdAt: now(),
            });
            event = {
              type: 'practice_schedule',
              subject: `Practice scheduled: ${data.title}`,
              preheader: `${memberDisplayName(user)} scheduled a new rehearsal.`,
              eyebrow: 'New rehearsal',
              title: data.title,
              intro: `${memberDisplayName(user)} scheduled a band practice. Check the details and submit your RSVP.`,
              details: practiceEmailDetails(state.practices[0], state),
              ctaLabel: 'View practice and RSVP',
            };
            break;
          }
          case 'practice.update': {
            if (!permissions.canSchedulePractice) {
              fail(403, 'Scheduling permission required.');
            }
            const target = practice();
            const data = practiceSchema.parse(p);
            if (data.endTime <= data.startTime) {
              fail(400, 'Practice must end after it starts.');
            }
            Object.assign(target, data);
            event = {
              type: 'practice_schedule',
              subject: `Practice updated: ${data.title}`,
              preheader: `${memberDisplayName(user)} changed the rehearsal details.`,
              eyebrow: 'Rehearsal updated',
              title: data.title,
              intro: `${memberDisplayName(user)} updated this practice. Review the latest schedule and confirm your RSVP.`,
              details: practiceEmailDetails(target, state),
              ctaLabel: 'Review updated practice',
            };
            break;
          }
          case 'practice.rsvp': {
            const target = practice();
            const status = z
              .enum(['attending', 'tentative', 'declined'])
              .parse(p.status);
            target.rsvps = target.rsvps.filter((r) => r.userId !== user.id);
            target.rsvps.push({
              userId: user.id,
              userName: memberDisplayName(user),
              userAvatar: user.avatar,
              status,
              updatedAt: now(),
            });
            break;
          }
          case 'practice.delete':
            if (!permissions.canSchedulePractice) {
              fail(403, 'Scheduling permission required.');
            }
            practice();
            state.practices = state.practices.filter(
              (s) => s.id !== p.practiceId
            );
            break;
          default:
            fail(400, 'Unknown action.');
        }
        store.write(state);
      });

      removeMediaFiles(deletedMedia);

      if (invitationRecipient) {
        const recipient = invitationRecipient;
        const invitationState = store.read();
        const bandName = invitationState.band.name;
        const invitationEmail = brandedEmail(
          {
            preheader: `${memberDisplayName(user)} invited you to join ${bandName}.`,
            eyebrow: 'Band invitation',
            title: `Join ${bandName}`,
            greeting: memberDisplayName(recipient),
            intro: `${memberDisplayName(user)} invited you to the band's private workspace for demos, lyrics, feedback, and rehearsal planning.`,
            details: [
              { label: 'Workspace', value: bandName },
              { label: 'Sign-in email', value: recipient.email },
              { label: 'Role', value: recipient.role },
              { label: 'Instrument', value: recipient.instrument },
            ],
            ctaLabel: `Sign in to ${bandName}`,
            afterCta:
              'Your Band Admin will share your initial password separately. After signing in, change it under Profile Management.',
          },
          invitationState,
        );
        const log = await deliver(
          recipient.email,
          memberDisplayName(recipient),
          `[${bandName}] You're invited to the band workspace`,
          invitationEmail,
          'member_invite',
          true
        );
        result = {
          memberId: recipient.id,
          invitation: {
            status: log.status === 'sent' ? 'sent' : 'failed',
            message:
              log.status === 'sent'
                ? `Invitation email sent to ${recipient.email}.`
                : `Invitation email was not sent to ${recipient.email}. ${log.errorMessage || 'Check Email Settings and try again.'}`,
            logId: log.id,
          },
        };
      }

      res.json({
        state: snapshot(
          store.members().find((u) => u.id === user.id) || user
        ),
        result,
      });

      if (event) {
        void notify(user, event).catch((error) =>
          console.error('Notification failed:', error.message)
        );
      }
    })
  );

  function transport(settings: SmtpSettings, plainPassword?: string) {
    if (!settings.host) fail(400, 'SMTP host is required.');
    return nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.encryption === 'ssl',
      requireTLS: settings.encryption === 'tls',
      ignoreTLS: settings.encryption === 'none',
      auth: settings.authRequired
        ? {
            user: settings.username,
            pass:
              plainPassword === undefined
                ? decrypt(settings.password)
                : plainPassword,
          }
        : undefined,
      connectionTimeout: 8e3,
      greetingTimeout: 8e3,
      socketTimeout: 15e3,
    });
  }

  async function deliver(
    to: string,
    toName: string,
    subject: string,
    emailContent: RenderedEmail,
    type: EmailEventType,
    requireDelivery = false
  ): Promise<EmailNotificationLog> {
    const settings = store.read().smtpSettings;
    const log: EmailNotificationLog = {
      id: randomUUID(),
      recipientEmail: to,
      recipientName: toName,
      subject,
      eventType: type,
      status: 'simulated',
      sentAt: now(),
      htmlContent: emailContent.html,
      textContent: emailContent.text,
      smtpHostUsed: settings.host,
    };
    if (!settings.isEnabled && requireDelivery) {
      log.status = 'failed';
      log.errorMessage =
        'SMTP is disabled. Enable SMTP in Email Settings, then resend the invitation.';
    }
    if (settings.isEnabled) {
      try {
        const preparedEmail = prepareEmailForDelivery(emailContent.html);
        await transport(settings).sendMail({
          from: {
            name: settings.fromName,
            address: settings.fromEmail || settings.username,
          },
          to: { name: toName, address: to },
          replyTo: settings.replyTo || undefined,
          subject,
          html: preparedEmail.html,
          text: emailContent.text,
          attachments: preparedEmail.attachments,
          disableFileAccess: true,
          disableUrlAccess: true,
        });
        log.status = 'sent';
      } catch (error) {
        log.status = 'failed';
        log.errorMessage =
          error instanceof Error ? error.message : 'SMTP delivery failed.';
      }
    }
    const state = store.read();
    state.emailLogs.unshift(log);
    state.emailLogs = state.emailLogs.slice(0, 1e3);
    store.write(state);
    return log;
  }

  async function notify(user: BandMember, event: AppNotification) {
    const state = store.read();
    if (!state.smtpSettings.isEnabled) return;
    const preference: Record<string, string> = {
      demo_archived: 'demoArchived',
      new_demo: 'newDemos',
      new_version: 'newVersions',
      lyric_edit: 'lyricEdits',
      practice_schedule: 'practiceSchedule',
      practice_reminder: 'practiceRsvpReminders',
      practice_event_reminder: 'practiceEventReminders',
      comment: 'comments',
      test_probe: 'newDemos',
      member_invite: 'newDemos',
    };
    for (const recipient of state.band.members.filter(
      (m) =>
        m.status === 'active' &&
        m.id !== user.id &&
        (m.notifications as any)?.[preference[event.type]] !== false
    )) {
      const email = brandedEmail(
        {
          ...event,
          greeting: memberDisplayName(recipient),
        },
        state,
      );
      await deliver(
        recipient.email,
        memberDisplayName(recipient),
        `[${state.band.name}] ${event.subject}`,
        email,
        event.type
      );
    }
  }

  function cleanupArchivedDemos(referenceTime = new Date()): number {
    const deletedMedia: string[] = [];
    let deletedCount = 0;
    store.transaction(() => {
      const state = store.read();
      if (!state.appSettings.autoDeleteArchivedDemos) return;

      const referenceIso = referenceTime.toISOString();
      const cutoff = referenceTime.getTime() - 30 * 24 * 60 * 60 * 1000;
      let changed = false;
      for (const target of [...state.songs]) {
        if (target.category !== 'archived') continue;
        if (!target.archivedAt) {
          target.archivedAt = referenceIso;
          changed = true;
          continue;
        }
        const archivedTime = Date.parse(target.archivedAt);
        if (Number.isFinite(archivedTime) && archivedTime <= cutoff) {
          collectSongDeletion(state, target, deletedMedia);
          deletedCount++;
          changed = true;
        }
      }
      if (changed) store.write(state);
    });
    removeMediaFiles(deletedMedia);
    return deletedCount;
  }

  async function sendPracticeReminders(
    referenceTime = new Date()
  ): Promise<number> {
    const state = store.read();
    if (!state.smtpSettings.isEnabled) {
      return 0;
    }

    const pending: Array<{
      recipient: BandMember;
      practice: (typeof state.practices)[number];
      type: 'practice_reminder' | 'practice_event_reminder';
      timing?: '1 day' | '4 hours';
    }> = [];
    let reminderStateChanged = false;

    for (const practice of state.practices) {
      const startsAt = new Date(`${practice.date}T${practice.startTime}:00`);
      const millisecondsUntilPractice =
        startsAt.getTime() - referenceTime.getTime();
      if (
        !Number.isFinite(startsAt.getTime()) ||
        millisecondsUntilPractice <= 0 ||
        millisecondsUntilPractice > PRACTICE_REMINDER_WINDOW_MS
      ) {
        continue;
      }

      const scheduleKey = `${practice.date}T${practice.startTime}`;
      if (practice.reminderScheduleKey !== scheduleKey) {
        practice.reminderScheduleKey = scheduleKey;
        practice.reminderDeliveryKeys = [];
        reminderStateChanged = true;
      }
      const delivered = new Set(practice.reminderDeliveryKeys ?? []);
      const deliveredBefore = delivered.size;

      for (const recipient of state.band.members) {
        const deliveryKey = `rsvp:${recipient.id}`;
        const rsvp = practice.rsvps.find(
          (entry) => entry.userId === recipient.id
        );
        if (
          recipient.status !== 'active' ||
          recipient.notifications?.practiceRsvpReminders === false ||
          delivered.has(deliveryKey) ||
          (rsvp && rsvp.status !== 'tentative')
        ) {
          continue;
        }
        delivered.add(deliveryKey);
        pending.push({ recipient, practice, type: 'practice_reminder' });
      }

      const dueWindows = [
        {
          enabled: practice.eventReminderOneDay ?? true,
          id: 'event-one-day',
          timing: '1 day' as const,
          maximum: PRACTICE_REMINDER_WINDOW_MS,
          minimum: PRACTICE_FINAL_REMINDER_WINDOW_MS,
        },
        {
          enabled: practice.eventReminderFourHours ?? true,
          id: 'event-four-hours',
          timing: '4 hours' as const,
          maximum: PRACTICE_FINAL_REMINDER_WINDOW_MS,
          minimum: 0,
        },
      ].filter(
        (window) =>
          window.enabled &&
          millisecondsUntilPractice <= window.maximum &&
          millisecondsUntilPractice > window.minimum
      );

      for (const window of dueWindows) {
        for (const recipient of state.band.members) {
          const deliveryKey = `${window.id}:${recipient.id}`;
          const rsvp = practice.rsvps.find(
            (entry) => entry.userId === recipient.id
          );
          if (
            recipient.status !== 'active' ||
            recipient.notifications?.practiceEventReminders === false ||
            delivered.has(deliveryKey) ||
            rsvp?.status !== 'attending'
          ) {
            continue;
          }
          delivered.add(deliveryKey);
          pending.push({
            recipient,
            practice,
            type: 'practice_event_reminder',
            timing: window.timing,
          });
        }
      }

      practice.reminderDeliveryKeys = [...delivered];
      if (delivered.size !== deliveredBefore) reminderStateChanged = true;
    }

    if (reminderStateChanged) store.write(state);

    for (const { recipient, practice, type, timing } of pending) {
      const needsRsvp = type === 'practice_reminder';
      const email = brandedEmail(
        {
          preheader: needsRsvp
            ? `Please RSVP for ${practice.title}.`
            : `${practice.title} starts in about ${timing}.`,
          eyebrow: needsRsvp ? 'RSVP needed' : 'Upcoming rehearsal',
          title: practice.title,
          greeting: memberDisplayName(recipient),
          intro: needsRsvp
            ? 'The band is finalizing this rehearsal. Let everyone know whether you are going, tentative, or unable to attend.'
            : `You RSVP'd Going. This rehearsal starts in about ${timing}. Here are the latest details.`,
          details: [
            ...practiceEmailDetails(practice, state),
            {
              label: 'Your RSVP',
              value: needsRsvp ? 'Response needed' : 'Going',
            },
          ],
          ctaLabel: needsRsvp
            ? 'Update your RSVP'
            : 'Open rehearsal details',
        },
        state,
      );
      await deliver(
        recipient.email,
        memberDisplayName(recipient),
        needsRsvp
          ? `[${state.band.name}] RSVP needed: ${practice.title}`
          : `[${state.band.name}] Practice reminder (${timing}): ${practice.title}`,
        email,
        type
      );
    }

    return pending.length;
  }

  app.post(
    '/api/smtp/verify',
    route(async (req: Request, res: Response) => {
      requireAdmin(res.locals.user);
      const fields = z
        .object({
          host: smtpSchema.shape.host,
          port: z.coerce.number().int().min(1).max(65535),
          encryption: smtpSchema.shape.encryption,
          username: short,
          password: z.string().max(1e3),
          authRequired: z.boolean().optional(),
        })
        .parse(req.body);
      const settings = {
        ...store.read().smtpSettings,
        ...fields,
        authRequired: fields.authRequired ?? Boolean(fields.username),
      };
      if (!fields.password) {
        settings.password = store.read().smtpSettings.password;
      }
      await transport(settings, fields.password || undefined).verify();
      res.json({ success: true, message: 'SMTP connection verified.' });
    })
  );

  app.post(
    '/api/smtp/test',
    route(async (req: Request, res: Response) => {
      const user = res.locals.user as BandMember;
      requireAdmin(user);
      const to = email.parse(req.body.to);
      const state = store.read();
      const log = await deliver(
        to,
        memberDisplayName(user),
        'RehearsalHQ SMTP test',
        brandedEmail(
          {
            preheader: 'Your RehearsalHQ email connection is working.',
            eyebrow: 'Email settings',
            title: 'SMTP connection successful',
            greeting: memberDisplayName(user),
            intro:
              'RehearsalHQ successfully generated and delivered this test message using your current email settings.',
            details: [
              {
                label: 'Sender',
                value: state.smtpSettings.fromName || state.band.name,
              },
              { label: 'Recipient', value: to },
              { label: 'SMTP host', value: state.smtpSettings.host },
            ],
            ctaLabel: 'Open Email Settings',
          },
          state,
        ),
        'test_probe'
      );
      res.json({
        success: log.status !== 'failed',
        message:
          log.errorMessage ||
          (log.status === 'sent'
            ? 'Test email sent.'
            : 'SMTP disabled; test recorded in outbox.'),
        log,
        state: snapshot(user),
      });
    })
  );

  app.post(
    '/api/smtp/resend',
    route(async (req: Request, res: Response) => {
      const user = res.locals.user as BandMember;
      requireAdmin(user);
      const old =
        store.read().emailLogs.find((l) => l.id === req.body.logId) ||
        fail(404, 'Email log not found.');
      const log = await deliver(
        old.recipientEmail,
        old.recipientName,
        old.subject,
        {
          html: old.htmlContent,
          text:
            old.textContent ||
            'Open RehearsalHQ to view this notification: ' + origin,
        },
        old.eventType,
        old.eventType === 'member_invite'
      );
      res.json({
        success: log.status !== 'failed',
        message: log.errorMessage || 'Email processed.',
        state: snapshot(user),
      });
    })
  );

  app.use(
    '/api',
    (_req: Request, _res: Response, next: NextFunction) =>
      next(new HttpError(404, 'API endpoint not found.'))
  );

  const errorHandler = (
    error: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      });
    }
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.status === 413) {
      return res
        .status(413)
        .json({ message: 'Upload exceeds the configured size limit.' });
    }
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ message: 'Invalid JSON request.' });
    }
    console.error(error);
    res
      .status(500)
      .json({ message: 'The server could not complete this request.' });
  };

  return {
    app,
    store,
    errorHandler,
    sendPracticeReminders,
    cleanupArchivedDemos,
  };
}
