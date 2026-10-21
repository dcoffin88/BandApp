import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import {
  DEFAULT_APPEARANCE,
  appearanceFrom,
  emptyState,
  type SharedState,
} from '../src/shared/defaults.ts';
import { memberDisplayName } from '../src/shared/member.ts';
import type { BandMember } from '../src/types/band.ts';

function refreshMemberIdentities(state: SharedState): void {
  const membersById = new Map(
    state.band.members.map((member) => [member.id, member]),
  );
  const currentIdentity = (userId: string) => {
    const member = membersById.get(userId);
    return member
      ? { name: memberDisplayName(member), avatar: member.avatar }
      : undefined;
  };

  for (const song of state.songs) {
    const creator = currentIdentity(song.createdBy.id);
    if (creator) Object.assign(song.createdBy, creator);

    for (const version of song.versions) {
      const uploader = currentIdentity(version.uploadedBy.id);
      if (uploader) Object.assign(version.uploadedBy, uploader);
    }

    for (const comment of song.comments) {
      const commenter = currentIdentity(comment.userId);
      if (commenter) {
        comment.userName = commenter.name;
        comment.userAvatar = commenter.avatar;
      }
    }
  }

  for (const practice of state.practices) {
    for (const rsvp of practice.rsvps) {
      const member = currentIdentity(rsvp.userId);
      if (member) {
        rsvp.userName = member.name;
        rsvp.userAvatar = member.avatar;
      }
    }
  }

  for (const entry of state.auditLogs) {
    if (!entry.userId) continue;
    const member = currentIdentity(entry.userId);
    if (member) entry.userName = member.name;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64, {
    N: 32768,
    maxmem: 64 * 1024 * 1024,
  }).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hex] = stored.split(':');
  if (!salt || !hex) return false;
  const actual = scryptSync(password, salt, 64, {
    N: 32768,
    maxmem: 64 * 1024 * 1024,
  });
  const expected = Buffer.from(hex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const tokenHash = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export function openDatabase(filename: string) {
  if (filename !== ':memory:') {
    mkdirSync(path.dirname(filename), { recursive: true });
  }
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);
    INSERT INTO schema_version SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_version);
    CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id=1), value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, profile TEXT NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts (email TEXT PRIMARY KEY, failures INTEGER NOT NULL, locked_until INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL, created_at INTEGER NOT NULL);
  `);

  const versionRow = db.prepare('SELECT version FROM schema_version').get() as {
    version: number;
  };
  let schemaVersion = versionRow.version;
  if (![1, 2, 3].includes(schemaVersion)) {
    throw new Error(
      'Unsupported database version; restore the matching application release.'
    );
  }
  if (schemaVersion === 1) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(
        "ALTER TABLE uploads ADD COLUMN relative_path TEXT; UPDATE schema_version SET version=2; COMMIT;"
      );
      schemaVersion = 2;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  if (schemaVersion === 2) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const rows = db.prepare('SELECT id,profile FROM users').all() as Array<{
        id: string;
        profile: string;
      }>;
      const updateProfile = db.prepare('UPDATE users SET profile=? WHERE id=?');
      for (const row of rows) {
        const profile = JSON.parse(String(row.profile)) as Record<string, unknown>;
        if (profile.role === 'editor') {
          profile.role = 'member';
          updateProfile.run(JSON.stringify(profile), row.id);
        }
      }
      db.exec('UPDATE schema_version SET version=3; COMMIT;');
      schemaVersion = 3;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  db.prepare('INSERT OR IGNORE INTO state (id,value) VALUES (1,?)').run(
    JSON.stringify(emptyState())
  );

  function members(): BandMember[] {
    return (
      db.prepare('SELECT profile FROM users ORDER BY rowid').all() as Array<{
        profile: string;
      }>
    ).map((row) => JSON.parse(String(row.profile)) as BandMember);
  }

  function read(): SharedState {
    const row = db.prepare('SELECT value FROM state WHERE id=1').get() as {
      value: string;
    };
    const state = JSON.parse(String(row.value)) as SharedState;
    state.band.members = members();
    state.appSettings.timeFormat ??= '12';
    state.smtpSettings.notificationTriggers.practiceEventReminder ??= true;
    refreshMemberIdentities(state);
    return state;
  }

  function write(state: SharedState): void {
    state.revision++;
    db.prepare('UPDATE state SET value=? WHERE id=1').run(
      JSON.stringify({ ...state, band: { ...state.band, members: [] } })
    );
  }

  function saveUser(user: BandMember, passwordHash?: string): void {
    const { password: _password, ...profile } = {
      ...user,
      appearanceSettings: appearanceFrom(
        user.appearanceSettings ?? DEFAULT_APPEARANCE,
      ),
    };
    if (passwordHash) {
      db.prepare(
        'INSERT INTO users (id,email,profile,password_hash) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,profile=excluded.profile,password_hash=excluded.password_hash'
      ).run(
        user.id,
        user.email.toLowerCase(),
        JSON.stringify(profile),
        passwordHash
      );
    } else {
      db.prepare('UPDATE users SET email=?,profile=? WHERE id=?').run(
        user.email.toLowerCase(),
        JSON.stringify(profile),
        user.id
      );
    }
  }

  function transaction<T>(fn: () => T): T {
    db.exec('BEGIN IMMEDIATE');
    try {
      const value = fn();
      db.exec('COMMIT');
      return value;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  transaction(() => {
    const legacyAppearance = appearanceFrom({
      ...DEFAULT_APPEARANCE,
      ...read().appSettings,
    });
    for (const user of members()) {
      if (!user.appearanceSettings) {
        saveUser({ ...user, appearanceSettings: legacyAppearance });
      }
    }
  });

  return { db, read, write, members, saveUser, transaction };
}

export type DatabaseStore = ReturnType<typeof openDatabase>;
