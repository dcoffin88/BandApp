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

  function location(userName: string, category: string, id: string, mime: string): string {
    let folder =
      userName
        .normalize('NFKC')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || 'user';
    if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(folder)) {
      folder = '_' + folder;
    }
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
    return [folder, category, `${id}.${extensions[mime] || 'audio'}`].join('/');
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

  const state = store.read();
  const legacyIds = store.db
    .prepare("SELECT id FROM uploads WHERE relative_path IS NULL")
    .all() as Array<{ id: string }>;
  for (const entry of legacyIds) {
    const row = store.db.prepare('SELECT * FROM uploads WHERE id=?').get(entry.id) as any;
    if (!row) continue;
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
      song?.category || 'idea',
      String(row.id),
      String(row.mime)
    );
    write(relative, row.data);
    store.db
      .prepare(
        "UPDATE uploads SET relative_path=?,data=X'' WHERE id=? AND relative_path IS NULL"
      )
      .run(relative, row.id);
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
