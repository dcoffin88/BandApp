# BandApp

Shared band workspace for audio takes, lyrics, rehearsals and member management.
The Express API authenticates data requests and enforces Admin, Editor, Member and
Guest permissions. SQLite stores band data, audio file metadata, password hashes and sessions.
Browsers no longer store accounts or SMTP credentials.

## Run with Docker Compose

Requires Docker Engine with Compose and Linux containers. From this directory:

```sh
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in `APP_SECRET`, set `INITIAL_ADMIN_EMAIL` and a unique
`INITIAL_ADMIN_PASSWORD` of at least 12 characters, and set `APP_URL` to the exact
origin users will visit. PowerShell users can use `Copy-Item .env.example .env`.
Then run:

```sh
docker compose config --quiet
docker compose up -d --build --wait
docker compose logs --tail=100 -f app
```

The default URL is `http://localhost:3000`. For production, place an HTTPS reverse
proxy in front of port 3000, set `APP_URL=https://band.example.com` and
`TRUST_PROXY_HOPS=1` for one trusted proxy. Match the proxy's body size limit to
`MAX_UPLOAD_MB` and allow up to 120 seconds for uploads. Keep port 3000 private.
HTTPS also enables Secure session cookies and remote microphone recording.
The Compose port defaults to loopback; a proxy in another container should reach
`app:3000` on a shared Docker network. Configure that network in your deployment.

Sign in using the initial Admin account. Create other members under User Management;
the app sends an invitation through the saved SMTP configuration and reports its
delivery result. Use **Resend invite** on a member's row to retry without creating
another account. Invitations are recorded in the Email Settings outbox, including
failures when SMTP is disabled or delivery is rejected. Give each member their
unique initial password through a separate private channel; passwords are not
included in invitations or email logs. Members can
change their passwords under Profile Management. Public registration, one-click
demo logins and account impersonation are unavailable. Initial Admin variables only
provision a new database; changing them does not reset an existing password.
After provisioning, they can be removed from `.env` and the service recreated.

The image uses a multi-stage build and runs as an unprivileged user with a read-only
root filesystem. Compose configures a persistent volume, health check, restart
policy, resource limits, rotated logs and graceful shutdown. No Vite dev server
runs in production. See [Docker's multi-stage build documentation](https://docs.docker.com/build/building/multi-stage/).

## Data and backups

The `bandapp_data` volume holds `/app/data/bandapp.sqlite`. Uploaded audio has its
own `bandapp_media` volume mounted at `/media`, separate from the database:

```text
/media/<userName>/<category>/<unique-file-id>.<extension>
/media/Dave_Coffin/riff/12345678-1234-4234-8234-123456789abc.wav
```

`userName` is the uploader's display name when the file is uploaded. Spaces and
unsafe folder characters become underscores. Existing folders stay in place when
a member changes their name. Categories are `idea`, `chorus`, `riff`, `bass`, `full`,
`verse` and `bridge`. File IDs prevent name collisions. Files remain behind the
authenticated audio API, rather than a public static media directory.

To mount an existing host directory instead, set `MEDIA_MOUNT=/srv/bandapp/media`
in `.env`. Create it with write access for container UID/GID `1000:1000` before
starting the app. For local npm runs, `MEDIA_DIR` defaults to `./media`.

Existing SQLite audio is copied into the media mount automatically on startup.
Each blob is cleared from SQLite only after its file has been written; playback
URLs stay unchanged. Back up the old database before this upgrade. Freed SQLite
pages are reused; migration does not automatically shrink the database file.

`docker compose down` preserves both named volumes.
**`docker compose down -v` deletes both named volumes.** Host bind mounts remain.
Use one application container and a local Docker volume; this SQLite deployment
does not support multiple application replicas or a network filesystem.

Back up the database **and** media together. Stop writes while taking the snapshot,
and use a new backup directory for each snapshot:

```sh
docker compose stop app
docker compose run --rm --no-deps app node scripts/backup.mjs /app/data/backups/bandapp.sqlite
docker compose cp app:/app/data/backups/bandapp.sqlite ./bandapp-backup.sqlite
docker compose cp app:/media/. ./bandapp-media-backup
docker compose start app
```

Preserve `APP_SECRET` separately with your secrets manager; it is required to decrypt
SMTP credentials after restoring. Protect backups because they contain private band
data and password hashes. Automate backup retention outside this Compose project.

To restore, put the matching `bandapp-backup.sqlite` and `bandapp-media-backup`
directory here, stop the app, then restore both using the container's user:

```sh
docker compose stop app
docker compose run --rm --no-deps -v "${PWD}/bandapp-backup.sqlite:/backup.sqlite:ro" app node -e "const fs=require('node:fs'); fs.copyFileSync('/backup.sqlite','/app/data/bandapp.sqlite'); for(const suffix of ['-wal','-shm']) fs.rmSync('/app/data/bandapp.sqlite'+suffix,{force:true})"
docker compose run --rm --no-deps -v "${PWD}/bandapp-media-backup:/media-backup:ro" app node -e "require('node:fs').cpSync('/media-backup','/media',{recursive:true})"
docker compose start app
```

Always restore a backup with the application release that created it, then test
sign-in and audio playback. Before an update, make a backup; rebuild using
`docker compose up -d --build --wait`.

## SMTP and authentication

Configure SMTP through Admin settings. SMTP passwords are encrypted on the server
with `APP_SECRET`, omitted from API responses, and preserved when the password field
is left blank. SMTP connection tests and resends require an Admin session. TLS
certificate validation remains enabled. Delivery failures appear in the shared
outbox. Notifications are sent after the underlying action succeeds; delivery is
best effort, without a durable background job queue or timed reminder scheduler.

Login uses salted scrypt hashes, opaque HttpOnly/SameSite cookies, account lockout,
request rate limits and origin checks. Session lifetime is an absolute duration
from sign-in. Password changes revoke other sessions. Suspended users cannot access
the API. Google login and TOTP/2FA are not implemented; the 2FA control is disabled.
Live changes from other devices refresh every 15 seconds or when the window focuses.

Existing demo data in browser localStorage is left untouched but is not imported
into the shared database. Browser `blob:` audio URLs cannot be recovered on the
server. Export important local audio before changing deployments and upload it to
the shared workspace. Production starts with an empty workspace and the configured
Admin, without seeded demo accounts or default passwords.

## Local development and checks

Use Node 24.13 or newer in the Node 24 line. Set up `.env` as above, then:

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
```

To run the compiled production server locally, set `NODE_ENV=production` and run
`npm start`. `npm run backup` creates a database-only backup; copy `MEDIA_DIR`
separately while the app is stopped for a complete snapshot.
The Node 24 built-in SQLite API currently emits an experimental-feature warning.
