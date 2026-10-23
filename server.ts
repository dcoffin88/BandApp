import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { createApplication } from './server/app.ts';

dotenv.config();
process.umask(0o077);
const root = path.dirname(fileURLToPath(import.meta.url));
const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Invalid PORT.');
const appUrl =
  process.env.APP_URL || (production ? '' : 'http://localhost:' + port);
if (!appUrl) throw new Error('APP_URL is required in production.');
const url = new URL(appUrl);
if (
  !['http:', 'https:'].includes(url.protocol) ||
  url.pathname !== '/' ||
  url.search ||
  url.hash ||
  url.username ||
  url.password
)
  throw new Error('APP_URL must be an HTTP(S) origin without a path.');
const secret = process.env.APP_SECRET || '';
if (secret.length < 32)
  throw new Error('APP_SECRET must contain at least 32 characters.');
const trustProxy = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(trustProxy) || trustProxy < 0)
  throw new Error('Invalid TRUST_PROXY_HOPS.');
const uploadLimitMb = Number(process.env.MAX_UPLOAD_MB || 100);
if (
  !Number.isInteger(uploadLimitMb) ||
  uploadLimitMb < 1 ||
  uploadLimitMb > 500
)
  throw new Error('MAX_UPLOAD_MB must be between 1 and 500.');
const {
  app,
  store,
  errorHandler,
  sendPracticeReminders,
  cleanupArchivedDemos,
  cleanupPastPractices,
} = createApplication({
  development: !production,
  mediaDirectory: process.env.MEDIA_DIR || './media',
  databasePath: path.resolve(
    process.env.DATA_DIR || './data',
    'rehearsalhq.sqlite',
  ),
  appUrl,
  secret,
  secureCookies: url.protocol === 'https:',
  trustProxy,
  uploadLimitMb,
  adminEmail: process.env.INITIAL_ADMIN_EMAIL,
  adminPassword: process.env.INITIAL_ADMIN_PASSWORD,
  adminName: process.env.INITIAL_ADMIN_NAME,
  bandName: process.env.INITIAL_BAND_NAME,
});

async function start() {
  if (production) {
    const dist = path.join(root, 'dist');
    if (!existsSync(path.join(dist, 'index.html')))
      throw new Error('Run npm run build before starting production.');
    app.use(
      '/assets',
      express.static(path.join(dist, 'assets'), {
        immutable: true,
        maxAge: '1y',
        fallthrough: false,
      }),
    );
    app.use(express.static(dist, { index: false, maxAge: 0 }));
    app.get('*', (req, res, next) => {
      if (path.extname(req.path)) return res.status(404).end();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'), (error) => {
        if (error) next(error);
      });
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }
  app.use(errorHandler);
  const server = app.listen(port, '0.0.0.0', () =>
    console.log('RehearsalHQ listening on port ' + port),
  );
  const runPracticeReminders = () =>
    void sendPracticeReminders().catch((error) =>
      console.error('Practice reminder check failed:', error),
    );
  runPracticeReminders();
  const practiceReminderTimer = setInterval(
    runPracticeReminders,
    15 * 60 * 1000,
  );
  practiceReminderTimer.unref();
  const runMaintenanceCleanup = () => {
    try {
      const deletedDemoCount = cleanupArchivedDemos();
      const deletedPracticeCount = cleanupPastPractices();
      if (deletedDemoCount > 0) {
        console.log(`Deleted ${deletedDemoCount} archived demo(s) older than 30 days.`);
      }
      if (deletedPracticeCount > 0) {
        console.log(`Deleted ${deletedPracticeCount} practice session(s) that ended over 30 days ago.`);
      }
    } catch (error) {
      console.error('Maintenance cleanup failed:', error);
    }
  };
  runMaintenanceCleanup();
  const maintenanceCleanupTimer = setInterval(
    runMaintenanceCleanup,
    60 * 60 * 1000,
  );
  maintenanceCleanupTimer.unref();
  server.requestTimeout = 120_000;
  server.headersTimeout = 30_000;
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    clearInterval(practiceReminderTimer);
    clearInterval(maintenanceCleanupTimer);
    console.log('Stopping RehearsalHQ...');
    const deadline = setTimeout(() => process.exit(1), 15_000);
    deadline.unref();
    server.close(() => {
      store.db.close();
      clearTimeout(deadline);
      process.exit(0);
    });
    server.closeIdleConnections();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  server.on('error', (error) => {
    console.error(error);
    store.db.close();
    process.exit(1);
  });
}
start().catch((error) => {
  console.error(error);
  store.db.close();
  process.exit(1);
});
