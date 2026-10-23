import {
  mkdirSync,
  writeFileSync,
  renameSync,
  rmSync,
  existsSync,
} from 'node:fs';
import path from 'node:path';
import type { DatabaseStore } from './database.ts';

export function createMediaStorage(store: DatabaseStore, directory: string) {
  const root = path.resolve(directory);
  mkdirSync(root, { recursive: true });

  function resolve(relative: string): string {
    const target = path.resolve(root, relative);
    if (path.isAbsolute(relative) || !target.startsWith(root + path.sep)) {
      throw new Error('Invalid media path.');
    }
    return target;
  }

  function safeFolder(value: string, fallback: string): string {
    let folder = value
        .normalize('NFKC')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || fallback;
    if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(folder)) {
      folder = '_' + folder;
    }
    return folder;
  }

  function location(userName: string, bandName: string, category: string, id: string, mime: string): string {
    const extensions: Record<string, string> = {
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/wave': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/aac': 'aac',
      'audio/ogg': 'ogg',
      'audio/webm': 'webm',
      'audio/flac': 'flac',
      'audio/x-flac': 'flac',
    };
    return [safeFolder(userName, 'user'), safeFolder(bandName, 'band'), safeFolder(category, 'audio'), `${id}.${extensions[mime] || 'audio'}`].join('/');
  }

  function write(relative: string, data: Buffer | Uint8Array): void {
    const filename = resolve(relative);
    mkdirSync(path.dirname(filename), { recursive: true });
    const temporary = filename + '.tmp';
    try {
      writeFileSync(temporary, data, { mode: 0o600 });
      renameSync(temporary, filename);
    } finally {
      rmSync(temporary, { force: true });
    }
  }

  function remove(relative: string): void {
    rmSync(resolve(relative), { force: true });
  }

  const legacyIds = store.db
    .prepare("SELECT id FROM uploads WHERE relative_path IS NULL OR relative_path NOT LIKE '%/%/%/%'")
    .all() as Array<{ id: string }>;
  for (const entry of legacyIds) {
    const row = store.db.prepare('SELECT * FROM uploads WHERE id=?').get(entry.id) as any;
    if (!row) continue;
    const state = store.read(row.band_id || store.defaultBandId());
    const owner = state.band.members.find(
      (member) => member.id === row.owner_id
    );
    const song = state.songs.find(
      (song) =>
        song.versions.some(
          (version) => version.audioUrl === `/api/uploads/${row.id}`
        )
    );
    const relative = location(
      owner?.name || String(row.owner_id),
      state.band.name,
      song?.category || 'idea',
      String(row.id),
      String(row.mime)
    );
    if (row.relative_path && existsSync(resolve(String(row.relative_path)))) {
      const destination = resolve(relative);
      mkdirSync(path.dirname(destination), { recursive: true });
      renameSync(resolve(String(row.relative_path)), destination);
    } else {
      write(relative, row.data);
    }
    store.db
      .prepare(
        "UPDATE uploads SET relative_path=?,band_id=?,data=X'' WHERE id=?"
      )
      .run(relative, state.band.id, row.id);
  }

  return {
    root,
    resolve,
    location,
    write,
    remove,
    exists: (relative: string) => existsSync(resolve(relative)),
  };
}

export type MediaStorage = ReturnType<typeof createMediaStorage>;
