import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
  randomUUID,
} from 'node:crypto';
import {
  DEFAULT_APPEARANCE,
  appearanceFrom,
  notificationsFrom,
  emptyState,
  type SharedState,
} from '../src/shared/defaults.ts';
import { memberDisplayName } from '../src/shared/member.ts';
import {
  DEFAULT_DEMO_CATEGORIES,
  categoryLabel,
} from '../src/shared/songMetadata.ts';
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
    CREATE TABLE IF NOT EXISTS user_two_factor (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, secret TEXT NOT NULL, recovery_hashes TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS two_factor_challenges (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, secret TEXT NOT NULL, recovery_hashes TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS trusted_devices (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS account_setup_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL, created_at INTEGER NOT NULL);
  `);

  const versionRow = db.prepare('SELECT version FROM schema_version').get() as {
    version: number;
  };
  let schemaVersion = versionRow.version;
  db.prepare('INSERT OR IGNORE INTO state (id,value) VALUES (1,?)').run(
    JSON.stringify(emptyState())
  );
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(schemaVersion)) {
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
  if (schemaVersion === 3) {
    db.exec('UPDATE schema_version SET version=4');
    schemaVersion = 4;
  }
  if (schemaVersion === 4) {
    db.exec('UPDATE schema_version SET version=5');
    schemaVersion = 5;
  }
  if (schemaVersion === 5) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS band_states (id TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS band_memberships (
          band_id TEXT NOT NULL REFERENCES band_states(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK(role IN ('admin','member','guest')),
          PRIMARY KEY (band_id,user_id)
        );
      `);
      const sessionColumns = db.prepare('PRAGMA table_info(sessions)').all() as Array<{ name: string }>;
      if (!sessionColumns.some((column) => column.name === 'band_id')) {
        db.exec('ALTER TABLE sessions ADD COLUMN band_id TEXT');
      }
      const uploadColumns = db.prepare('PRAGMA table_info(uploads)').all() as Array<{ name: string }>;
      if (!uploadColumns.some((column) => column.name === 'band_id')) {
        db.exec('ALTER TABLE uploads ADD COLUMN band_id TEXT');
      }
      const legacyRow = db.prepare('SELECT value FROM state WHERE id=1').get() as { value: string };
      const legacy = JSON.parse(String(legacyRow.value)) as SharedState;
      const bandId = legacy.band.id || randomUUID();
      legacy.band.id = bandId;
      db.prepare('INSERT OR IGNORE INTO band_states (id,value) VALUES (?,?)').run(
        bandId,
        JSON.stringify({ ...legacy, band: { ...legacy.band, members: [] } }),
      );
      const users = db.prepare('SELECT id,profile FROM users ORDER BY rowid').all() as Array<{ id: string; profile: string }>;
      const addMembership = db.prepare('INSERT OR IGNORE INTO band_memberships VALUES (?,?,?)');
      let promoted = false;
      const updateProfile = db.prepare('UPDATE users SET profile=? WHERE id=?');
      for (const row of users) {
        const profile = JSON.parse(String(row.profile)) as BandMember;
        const role = ['admin', 'member', 'guest'].includes(profile.role) ? profile.role : 'guest';
        addMembership.run(bandId, row.id, role);
        if (!promoted && role === 'admin' && profile.status === 'active') {
          profile.isSuperAdmin = true;
          updateProfile.run(JSON.stringify(profile), row.id);
          promoted = true;
        }
      }
      db.prepare('UPDATE sessions SET band_id=? WHERE band_id IS NULL').run(bandId);
      db.prepare('UPDATE uploads SET band_id=? WHERE band_id IS NULL').run(bandId);
      db.exec('UPDATE schema_version SET version=6; COMMIT;');
      schemaVersion = 6;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  if (schemaVersion === 6) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec('CREATE TABLE IF NOT EXISTS global_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
      const firstBand = db.prepare('SELECT value FROM band_states ORDER BY rowid LIMIT 1').get() as { value: string };
      const firstState = JSON.parse(String(firstBand.value)) as SharedState;
      db.prepare('INSERT OR IGNORE INTO global_settings (key,value) VALUES (?,?)').run(
        'smtp',
        JSON.stringify(firstState.smtpSettings),
      );
      db.exec('UPDATE schema_version SET version=7; COMMIT;');
      schemaVersion = 7;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  if (schemaVersion === 7) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const firstBand = db.prepare('SELECT value FROM band_states ORDER BY rowid LIMIT 1').get() as { value: string };
      const firstState = JSON.parse(String(firstBand.value)) as SharedState;
      db.prepare('INSERT OR IGNORE INTO global_settings (key,value) VALUES (?,?)').run(
        'auth',
        JSON.stringify(firstState.authSettings),
      );
      db.exec('UPDATE schema_version SET version=8; COMMIT;');
      schemaVersion = 8;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  if (schemaVersion === 8) {
    db.exec('UPDATE schema_version SET version=9');
    schemaVersion = 9;
  }
  if (schemaVersion === 9) {
    db.exec('UPDATE schema_version SET version=10');
    schemaVersion = 10;
  }

  function defaultBandId(): string {
    const row = db.prepare('SELECT id FROM band_states ORDER BY rowid LIMIT 1').get() as { id: string } | undefined;
    if (!row) throw new Error('No band is configured.');
    return row.id;
  }

  function members(bandId?: string): BandMember[] {
    const rows = bandId
      ? db.prepare(`SELECT u.profile,m.role FROM users u JOIN band_memberships m ON m.user_id=u.id WHERE m.band_id=? ORDER BY u.rowid`).all(bandId) as Array<{ profile: string; role: string }>
      : db.prepare('SELECT profile,NULL AS role FROM users ORDER BY rowid').all() as Array<{ profile: string; role: string | null }>;
    return rows.map((row) => {
      const member = JSON.parse(String(row.profile)) as BandMember;
      if (row.role) member.role = row.role as BandMember['role'];
      member.twoFactorEnabled = Boolean(
        db.prepare('SELECT 1 FROM user_two_factor WHERE user_id=?').get(member.id),
      );
      return member;
    });
  }

  function read(bandId = defaultBandId()): SharedState {
    const row = db.prepare('SELECT value FROM band_states WHERE id=?').get(bandId) as {
      value: string;
    } | undefined;
    if (!row) throw new Error('Band not found.');
    const state = JSON.parse(String(row.value)) as SharedState;
    const globalSmtp = db.prepare("SELECT value FROM global_settings WHERE key='smtp'").get() as { value: string } | undefined;
    if (globalSmtp) state.smtpSettings = JSON.parse(String(globalSmtp.value));
    const globalAuth = db.prepare("SELECT value FROM global_settings WHERE key='auth'").get() as { value: string } | undefined;
    if (globalAuth) state.authSettings = JSON.parse(String(globalAuth.value));
    state.band.members = members(bandId);
    state.appSettings.timeFormat ??= '12';
    state.appSettings.autoDeleteArchivedDemos ??= true;
    state.appSettings.demoCategories ??= DEFAULT_DEMO_CATEGORIES.map(
      (category) => ({ ...category }),
    );
    if (
      !state.appSettings.demoCategories.some(
        (category) => category.id === 'archived',
      )
    ) {
      state.appSettings.demoCategories.push({
        id: 'archived',
        label: 'Archived',
      });
    }
    for (const song of state.songs) {
      if (
        !state.appSettings.demoCategories.some(
          (category) => category.id === song.category,
        )
      ) {
        state.appSettings.demoCategories.push({
          id: song.category,
          label: categoryLabel([], song.category),
        });
      }
    }
    state.smtpSettings.notificationTriggers.practiceEventReminder ??= true;
    refreshMemberIdentities(state);
    return state;
  }

  function write(state: SharedState, bandId = state.band.id): void {
    state.revision++;
    db.prepare('UPDATE band_states SET value=? WHERE id=?').run(
      JSON.stringify({ ...state, band: { ...state.band, id: bandId, members: [] } }),
      bandId,
    );
  }

  function bandsForUser(userId: string) {
    return db.prepare(`SELECT b.id,b.value,m.role FROM band_states b JOIN band_memberships m ON m.band_id=b.id WHERE m.user_id=? ORDER BY b.rowid`).all(userId).map((row: any) => ({
      id: String(row.id),
      name: (JSON.parse(String(row.value)) as SharedState).band.name,
      role: row.role as BandMember['role'],
    }));
  }

  function bandIds(): string[] {
    return (db.prepare('SELECT id FROM band_states ORDER BY rowid').all() as Array<{ id: string }>).map((row) => row.id);
  }

  function createBand(name: string, creatorId: string): SharedState {
    const state = emptyState();
    state.band.id = randomUUID();
    state.band.name = name;
    db.prepare('INSERT INTO band_states (id,value) VALUES (?,?)').run(
      state.band.id,
      JSON.stringify(state),
    );
    setMembership(state.band.id, creatorId, 'admin');
    for (const superAdmin of members().filter((member) => member.isSuperAdmin)) {
      setMembership(state.band.id, superAdmin.id, 'admin');
    }
    return read(state.band.id);
  }

  function setMembership(bandId: string, userId: string, role: BandMember['role']) {
    db.prepare('INSERT INTO band_memberships VALUES (?,?,?) ON CONFLICT(band_id,user_id) DO UPDATE SET role=excluded.role').run(bandId, userId, role);
  }

  function removeMembership(bandId: string, userId: string) {
    db.prepare('DELETE FROM band_memberships WHERE band_id=? AND user_id=?').run(bandId, userId);
  }

  function saveSmtpSettings(settings: SharedState['smtpSettings']) {
    db.prepare("INSERT INTO global_settings (key,value) VALUES ('smtp',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(
      JSON.stringify(settings),
    );
  }

  function saveAuthSettings(settings: SharedState['authSettings']) {
    db.prepare("INSERT INTO global_settings (key,value) VALUES ('auth',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(
      JSON.stringify(settings),
    );
  }

  function saveUser(user: BandMember, passwordHash?: string, initialBandId?: string): void {
    const existed = Boolean(db.prepare('SELECT 1 FROM users WHERE id=?').get(user.id));
    const { password: _password, twoFactorEnabled: _twoFactorEnabled, activeBandId: _activeBandId, ...profile } = {
      ...user,
      notifications: notificationsFrom(user.notifications),
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
    if (!existed && passwordHash) {
      setMembership(initialBandId || defaultBandId(), user.id, user.role);
    }
    if (user.isSuperAdmin) {
      for (const bandId of bandIds()) setMembership(bandId, user.id, 'admin');
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
      saveUser({
        ...user,
        notifications: notificationsFrom(user.notifications),
        appearanceSettings: user.appearanceSettings ?? legacyAppearance,
      });
    }
  });

  return { db, read, write, members, saveUser, transaction, defaultBandId, bandIds, bandsForUser, createBand, setMembership, removeMembership, saveSmtpSettings, saveAuthSettings };
}

export type DatabaseStore = ReturnType<typeof openDatabase>;
