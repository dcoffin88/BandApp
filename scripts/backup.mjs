import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
process.umask(0o077);

const dataDir = process.env.DATA_DIR || './data';
const target = path.resolve(
  process.argv[2] ||
    path.join(
      dataDir,
      'backups',
      `bandapp-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`,
    ),
);
mkdirSync(path.dirname(target), { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'bandapp.sqlite'), {
  readOnly: true,
});
try {
  await backup(db, target);
  console.log(target);
} finally {
  db.close();
}
