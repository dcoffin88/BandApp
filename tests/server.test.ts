import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createServer, type Socket } from 'node:net';
import { backup, DatabaseSync } from 'node:sqlite';
import {
  createApplication,
  type ApplicationOptions,
} from '../server/app.ts';
import { verifyPassword } from '../server/database.ts';

const password = 'Correct-Horse-123!';

async function localSmtp() {
  const messages: string[] = [];
  const sockets = new Set<Socket>();
  let rejectRecipients = false;
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.write('220 localhost test SMTP\r\n');
    let buffer = '',
      data = false,
      lines: string[] = [];
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data) {
          if (line === '.') {
            messages.push(lines.join('\r\n'));
            lines = [];
            data = false;
            socket.write('250 Message accepted\r\n');
          } else lines.push(line.replace(/^\.\./, '.'));
        } else if (/^(EHLO|HELO)/i.test(line))
          socket.write('250 localhost\r\n');
        else if (/^DATA/i.test(line)) {
          data = true;
          socket.write('354 End with dot\r\n');
        } else if (/^QUIT/i.test(line)) socket.end('221 Bye\r\n');
        else if (/^RCPT/i.test(line) && rejectRecipients)
          socket.write('550 Mailbox unavailable\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    messages,
    port: (server.address() as { port: number }).port,
    reject(value: boolean) {
      rejectRecipients = value;
    },
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

test('member invitations send through SMTP, report failures and can be resent without duplicate accounts', async () => {
  const f = await fixture();
  const smtp = await localSmtp();
  try {
    const admin = await f.login();
    const memberData = {
      name: 'Invited Member',
      email: 'invite@example.com',
      password,
      role: 'member',
      instrument: 'Guitar',
    };
    const disabled = await f.action(admin.cookie, 'member.add', memberData);
    assert.equal(disabled.status, 200);
    const first = await disabled.json();
    const userId = first.result.memberId;
    assert.equal(first.result.invitation.status, 'failed');
    assert.match(first.result.invitation.message, /SMTP is disabled/);
    assert.equal(first.state.band.members.length, 2);
    assert.equal(first.state.emailLogs[0].eventType, 'member_invite');
    assert.equal(first.state.emailLogs[0].status, 'failed');
    assert.equal(smtp.messages.length, 0);
    const retryDisabled = await f.request(
      '/api/smtp/resend',
      { logId: first.result.invitation.logId },
      admin.cookie,
    );
    assert.equal((await retryDisabled.json()).success, false);

    const config = {
      ...f.store.read().smtpSettings,
      isEnabled: true,
      host: '127.0.0.1',
      port: smtp.port,
      encryption: 'none',
      authRequired: false,
      username: '',
      password: '',
      fromEmail: 'band@example.com',
    };
    assert.equal(
      (await f.action(admin.cookie, 'smtp.update', config)).status,
      200,
    );
    const resent = await f.action(admin.cookie, 'member.invite', { userId });
    assert.equal(resent.status, 200);
    const sent = await resent.json();
    assert.equal(sent.result.invitation.status, 'sent');
    assert.equal(sent.state.band.members.length, 2);
    assert.equal(smtp.messages.length, 1);
    const message = smtp.messages[0]
      .replace(/=\r\n/g, '')
      .replace(/=([0-9A-F]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
    assert.match(message, /To: Invited Member <invite@example.com>/);
    assert.match(message, /http:\/\/localhost:3000/);
    assert.match(message, /share your initial password separately/);
    assert.ok(!message.includes(password));
    const member = await f.login(memberData.email);
    assert.equal(
      (await f.action(member.cookie, 'member.invite', { userId })).status,
      403,
    );
    assert.equal(smtp.messages.length, 1);

    smtp.reject(true);
    const failed = await f.action(admin.cookie, 'member.add', {
      ...memberData,
      name: 'Second Member',
      email: 'second@example.com',
    });
    assert.equal(failed.status, 200);
    const second = await failed.json();
    assert.equal(second.result.invitation.status, 'failed');
    assert.match(second.result.invitation.message, /550/);
    assert.equal(second.state.band.members.length, 3);
    assert.equal(second.state.emailLogs[0].status, 'failed');
    assert.equal(
      (await f.action(admin.cookie, 'member.add', memberData)).status,
      409,
    );
    smtp.reject(false);
    const recovered = await f.action(admin.cookie, 'member.invite', {
      userId: second.result.memberId,
    });
    const recoveredData = await recovered.json();
    assert.equal(recoveredData.result.invitation.status, 'sent');
    assert.equal(recoveredData.state.band.members.length, 3);
    assert.equal(smtp.messages.length, 2);
    assert.ok(
      !JSON.stringify(recoveredData.state.emailLogs).includes(password),
    );
  } finally {
    await smtp.close();
    await f.close();
  }
});

async function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), 'rehearsalhq-test-'));
  const options: ApplicationOptions = {
    development: false,
    databasePath: path.join(directory, 'rehearsalhq.sqlite'),
    mediaDirectory: path.join(directory, 'separate-media'),
    appUrl: 'http://localhost:3000',
    secret: 'test-secret-with-at-least-32-characters',
    secureCookies: false,
    trustProxy: 0,
    uploadLimitMb: 100,
    adminEmail: 'admin@example.com',
    adminPassword: password,
    bandName: 'Test Band',
  };
  let application = createApplication(options);
  let server = application.app
    .use(application.errorHandler)
    .listen(0, '127.0.0.1');
  await once(server, 'listening');
  let address = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  async function request(
    url: string,
    body?: unknown,
    cookie = '',
    extra: RequestInit = {},
  ) {
    return fetch(address + url, {
      ...extra,
      method: extra.method || (body === undefined ? 'GET' : 'POST'),
      headers: {
        'X-RehearsalHQ-Request': '1',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...extra.headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function login(email = 'admin@example.com', pass = password) {
    const response = await request('/api/auth/login', {
      email,
      password: pass,
    });
    assert.equal(response.status, 200, await response.clone().text());
    return {
      cookie: response.headers.get('set-cookie')!.split(';')[0],
      state: await response.json(),
      header: response.headers.get('set-cookie')!,
    };
  }
  async function action(cookie: string, action: string, payload: unknown) {
    return request('/api/actions', { action, payload }, cookie);
  }
  async function stop() {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    application.store.db.close();
  }
  return {
    directory,
    options,
    request,
    login,
    action,
    get store() {
      return application.store;
    },
    async restart() {
      await stop();
      application = createApplication(options);
      server = application.app
        .use(application.errorHandler)
        .listen(0, '127.0.0.1');
      await once(server, 'listening');
      address = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    },
    async close() {
      await stop();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test('signed-out sessions expose saved branding without private workspace data', async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    const logo = 'data:image/png;base64,iVBORw0KGgo=';
    const updated = await f.action(admin.cookie, 'app.update', {
      headerLogoUrl: logo,
      headerLogoShape: 'circle',
    });
    assert.equal(updated.status, 200);
    await f.restart();
    const response = await f.request('/api/auth/session');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const anonymous = await response.json();
    assert.deepEqual(Object.keys(anonymous).sort(), [
      'appSettings',
      'bandName',
      'currentUser',
    ]);
    assert.equal(anonymous.currentUser, null);
    assert.equal(anonymous.appSettings.headerLogoUrl, logo);
    assert.equal(anonymous.appSettings.headerLogoShape, 'circle');
    assert.equal(anonymous.appSettings.primaryColor, 'amber');
    assert.equal(anonymous.appSettings.appearance, 'dark');
    assert.equal((await f.request('/api/state')).status, 401);
  } finally {
    await f.close();
  }
});

test('appearance is personal, validated, persisted and cannot modify the band header', async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    const originalHeader = f.store.read().appSettings.headerLogoUrl;
    for (const role of ['member', 'guest']) {
      assert.equal(
        (
          await f.action(admin.cookie, 'member.add', {
            name: role,
            email: `${role}@example.com`,
            password,
            role,
            instrument: 'Guitar',
          })
        ).status,
        200,
      );
      const account = await f.login(`${role}@example.com`);
      const appearance = {
        primaryColor: 'custom',
        customColor: '#3366cc',
        appearance: 'light',
        radius: 'full',
        accentGlow: false,
      };
      const saved = await f.action(
        account.cookie,
        'appearance.update',
        appearance,
      );
      assert.equal(saved.status, 200);
      const result = await saved.json();
      assert.deepEqual(result.state.currentUser.appearanceSettings, appearance);
      assert.equal(
        result.state.appSettings.customColor,
        appearance.customColor,
      );
      assert.equal(
        (
          await f.action(account.cookie, 'appearance.update', {
            headerLogoUrl: '',
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await f.action(account.cookie, 'appearance.update', {
            userId: admin.state.currentUser.id,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await f.action(account.cookie, 'appearance.update', {
            customColor: 'red',
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await f.action(account.cookie, 'appearance.update', {
            appearance: 'invalid',
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await f.action(account.cookie, 'app.update', {
            headerSubtitle: 'Attack',
          })
        ).status,
        403,
      );
    }
    assert.equal(
      (
        await f.action(admin.cookie, 'appearance.update', {
          primaryColor: 'purple',
          appearance: 'system',
        })
      ).status,
      200,
    );
    assert.equal(
      (await f.action(admin.cookie, 'app.update', { primaryColor: 'rose' }))
        .status,
      400,
    );
    await f.restart();
    const member = await f.login('member@example.com');
    const guest = await f.login('guest@example.com');
    assert.equal(member.state.appSettings.customColor, '#3366cc');
    assert.equal(member.state.currentUser.appearanceSettings.radius, 'full');
    assert.equal(
      (
        await f.action(member.cookie, 'appearance.update', {
          primaryColor: 'cyan',
        })
      ).status,
      200,
    );
    const guestState = await (
      await f.request('/api/state', undefined, guest.cookie)
    ).json();
    const adminState = await (
      await f.request('/api/state', undefined, admin.cookie)
    ).json();
    assert.equal(guestState.appSettings.primaryColor, 'custom');
    assert.equal(adminState.appSettings.primaryColor, 'purple');
    assert.equal(adminState.appSettings.appearance, 'system');
    assert.equal(
      guestState.band.members.find(
        (m: any) => m.id === member.state.currentUser.id,
      ).appearanceSettings,
      undefined,
    );
    assert.equal(f.store.read().appSettings.headerLogoUrl, originalHeader);
    const publicSession = await (await f.request('/api/auth/session')).json();
    assert.equal(publicSession.appSettings.primaryColor, 'amber');
    assert.equal(publicSession.appSettings.appearance, 'dark');
  } finally {
    await f.close();
  }
});

test('existing accounts inherit the old shared appearance once when upgraded', async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    const state = f.store.read();
    state.appSettings = {
      ...state.appSettings,
      primaryColor: 'custom',
      customColor: '#123456',
      appearance: 'light',
      radius: 'small',
      accentGlow: false,
    };
    f.store.write(state);
    const oldUser = { ...f.store.members()[0] };
    delete oldUser.appearanceSettings;
    f.store.db
      .prepare('UPDATE users SET profile=? WHERE id=?')
      .run(JSON.stringify(oldUser), oldUser.id);
    await f.restart();
    const upgraded = await (
      await f.request('/api/state', undefined, admin.cookie)
    ).json();
    assert.equal(
      upgraded.currentUser.appearanceSettings.customColor,
      '#123456',
    );
    assert.equal(upgraded.currentUser.appearanceSettings.appearance, 'light');
    assert.equal(upgraded.currentUser.appearanceSettings.accentGlow, false);
    assert.equal(
      (
        await f.action(admin.cookie, 'appearance.update', {
          primaryColor: 'teal',
        })
      ).status,
      200,
    );
    await f.restart();
    assert.equal(f.store.members()[0].appearanceSettings!.primaryColor, 'teal');
  } finally {
    await f.close();
  }
});

test('legacy Editor accounts migrate to Member with merged permissions', async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    const created = await f.action(admin.cookie, 'member.add', {
      name: 'Legacy Editor',
      email: 'legacy-editor@example.com',
      password,
      role: 'member',
      instrument: 'Guitar',
    });
    assert.equal(created.status, 200, await created.clone().text());
    const { result } = await created.json();
    const row = f.store.db
      .prepare('SELECT profile FROM users WHERE id=?')
      .get(result.memberId) as { profile: string };
    const profile = JSON.parse(row.profile);
    profile.role = 'editor';
    f.store.db
      .prepare('UPDATE users SET profile=? WHERE id=?')
      .run(JSON.stringify(profile), result.memberId);
    f.store.db.prepare('UPDATE schema_version SET version=2').run();

    await f.restart();

    const migrated = await f.login('legacy-editor@example.com');
    assert.equal(migrated.state.currentUser.role, 'member');
    assert.equal(migrated.state.permissions.canSchedulePractice, true);
    assert.equal(
      (f.store.db.prepare('SELECT version FROM schema_version').get() as {
        version: number;
      }).version,
      3,
    );
  } finally {
    await f.close();
  }
});

test('server login, session protection, secret isolation and password rotation', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.request('/api/state')).status, 401);
    assert.equal((await f.request('/api/smtp/verify', {})).status, 401);
    assert.equal((await f.request('/api/auth/session')).status, 200);
    const anonymous = await (await f.request('/api/auth/session')).json();
    assert.equal(anonymous.currentUser, null);
    assert.equal(anonymous.bandName, 'Test Band');
    assert.equal(anonymous.band, undefined);
    assert.equal(
      (
        await f.request('/api/auth/login', {
          email: 'admin@example.com',
          password: 'wrong',
        })
      ).status,
      401,
    );
    const admin = await f.login();
    assert.match(admin.header, /HttpOnly/);
    assert.match(admin.header, /SameSite=Strict/);
    assert.equal(admin.state.band.members.length, 1);
    assert.equal(admin.state.songs.length, 0);
    assert.equal(admin.state.currentUser.password, undefined);
    assert.ok(!JSON.stringify(admin.state).includes(password));
    const stored = String(
      f.store.db.prepare('SELECT password_hash FROM users').get()!
        .password_hash,
    );
    assert.notEqual(stored, password);
    assert.ok(verifyPassword(password, stored));
    assert.equal(
      (
        await f.request(
          '/api/actions',
          { action: 'band.update', payload: { name: 'Attack' } },
          admin.cookie,
          { headers: { Origin: 'https://evil.example' } },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request(
          '/api/actions',
          { action: 'band.update', payload: { name: 'Attack' } },
          admin.cookie,
          { headers: { 'X-RehearsalHQ-Request': '' } },
        )
      ).status,
      403,
    );
    const second = await f.login();
    assert.equal(
      (
        await f.request(
          '/api/auth/password',
          { currentPassword: 'wrong', newPassword: 'Replacement-123!' },
          admin.cookie,
        )
      ).status,
      400,
    );
    const changed = await f.request(
      '/api/auth/password',
      { currentPassword: password, newPassword: 'Replacement-123!' },
      admin.cookie,
    );
    assert.equal(changed.status, 200);
    assert.equal(
      (await f.request('/api/state', undefined, second.cookie)).status,
      401,
    );
    assert.equal(
      (
        await f.request('/api/auth/login', {
          email: 'admin@example.com',
          password,
        })
      ).status,
      401,
    );
    await f.login('admin@example.com', 'Replacement-123!');
    const newCookie = changed.headers.get('set-cookie')!.split(';')[0];
    assert.equal(
      (await f.request('/api/auth/logout', {}, newCookie)).status,
      200,
    );
    assert.equal(
      (await f.request('/api/state', undefined, newCookie)).status,
      401,
    );
  } finally {
    await f.close();
  }
});

test('server enforces roles, self-update allowlist, lockout, expiry and last Admin', async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    for (const role of ['member', 'guest']) {
      const response = await f.action(admin.cookie, 'member.add', {
        name: role,
        email: `${role}@example.com`,
        password,
        role,
        instrument: 'Guitar',
      });
      assert.equal(response.status, 200, await response.clone().text());
    }
    assert.equal(
      (
        await f.action(admin.cookie, 'member.add', {
          name: 'Removed Editor Role',
          email: 'editor@example.com',
          password,
          role: 'editor',
          instrument: 'Guitar',
        })
      ).status,
      400,
    );
    const member = await f.login('member@example.com'),
      guest = await f.login('guest@example.com');
    const branding = {
      headerLogoUrl: 'data:image/png;base64,aGVhZGVy',
      headerLogoShape: 'circle',
      headerSubtitle: 'Admin header',
    };
    assert.equal(
      (await f.action(admin.cookie, 'app.update', branding)).status,
      200,
    );
    assert.equal(
      (await f.action(admin.cookie, 'band.update', { name: 'Admin Band' }))
        .status,
      200,
    );
    for (const role of ['member', 'guest']) {
      const account = await f.login(`${role}@example.com`);
      assert.equal(
        (
          await f.action(account.cookie, 'app.update', {
            ...branding,
            headerSubtitle: 'Unauthorized header',
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await f.action(account.cookie, 'band.update', {
            name: 'Unauthorized Band',
          })
        ).status,
        403,
      );
    }
    assert.equal(
      f.store.read().appSettings.headerSubtitle,
      branding.headerSubtitle,
    );
    assert.equal(
      f.store.read().appSettings.headerLogoUrl,
      branding.headerLogoUrl,
    );
    assert.equal(
      f.store.read().appSettings.headerLogoShape,
      branding.headerLogoShape,
    );
    assert.equal(f.store.read().band.name, 'Admin Band');
    assert.equal(
      (
        await f.action(member.cookie, 'member.role', {
          userId: member.state.currentUser.id,
          role: 'admin',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.action(member.cookie, 'member.profile', {
          userId: member.state.currentUser.id,
          updates: { role: 'admin' },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await f.action(member.cookie, 'member.profile', {
          userId: admin.state.currentUser.id,
          updates: { name: 'Attack' },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.action(member.cookie, 'member.password', {
          userId: member.state.currentUser.id,
          password: 'Replacement-123!',
        })
      ).status,
      403,
    );
    assert.equal(
      (await f.action(guest.cookie, 'app.update', { headerSubtitle: 'Attack' }))
        .status,
      403,
    );
    assert.equal(
      (await f.action(member.cookie, 'smtp.update', {})).status,
      403,
    );
    assert.equal(
      (
        await f.request(
          '/api/smtp/test',
          { to: 'member@example.com' },
          member.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.action(admin.cookie, 'member.delete', {
          userId: admin.state.currentUser.id,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await f.action(admin.cookie, 'member.role', {
          userId: admin.state.currentUser.id,
          role: 'guest',
        })
      ).status,
      400,
    );
    const profile = await f.action(member.cookie, 'member.profile', {
      userId: member.state.currentUser.id,
      updates: {
        name: 'Updated Member',
        avatar: member.state.currentUser.avatar,
      },
    });
    assert.equal(profile.status, 200, await profile.clone().text());
    assert.equal(
      (await f.request('/api/state', undefined, guest.cookie)).status,
      200,
    );
    const guestState = await (
      await f.request('/api/state', undefined, guest.cookie)
    ).json();
    assert.deepEqual(guestState.auditLogs, []);
    assert.equal(
      guestState.band.members.find((u: any) => u.role === 'admin').email,
      '',
    );
    f.store.db
      .prepare('UPDATE sessions SET expires_at=0 WHERE user_id=?')
      .run(guest.state.currentUser.id);
    assert.equal(
      (await f.request('/api/state', undefined, guest.cookie)).status,
      401,
    );
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await f.request('/api/auth/login', {
            email: 'guest@example.com',
            password: 'wrong',
          })
        ).status,
        401,
      );
    assert.equal(
      (
        await f.request('/api/auth/login', {
          email: 'guest@example.com',
          password,
        })
      ).status,
      429,
    );
    assert.equal(
      (
        await f.action(admin.cookie, 'member.status', {
          userId: member.state.currentUser.id,
          status: 'suspended',
        })
      ).status,
      200,
    );
    assert.equal(
      (await f.request('/api/state', undefined, member.cookie)).status,
      401,
    );
  } finally {
    await f.close();
  }
});

test('shared songs, audio byte ranges, lyrics, practices and settings survive restart and backup', async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    const upload = await f.request(
      '/api/uploads?category=riff',
      undefined,
      admin.cookie,
      {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: Buffer.from('RIFF-audio-test'),
      },
    );
    assert.equal(upload.status, 201, await upload.clone().text());
    const { audioUrl } = await upload.json();
    const uploadRow = f.store.db
      .prepare('SELECT relative_path,length(data) AS bytes FROM uploads')
      .get()!;
    assert.match(
      String(uploadRow.relative_path),
      /^Band_Admin\/riff\/[a-f0-9-]+\.wav$/,
    );
    assert.equal(uploadRow.bytes, 0);
    const audioPath = path.join(
      f.options.mediaDirectory!,
      String(uploadRow.relative_path),
    );
    assert.equal(readFileSync(audioPath).toString(), 'RIFF-audio-test');
    assert.equal((await f.request(audioUrl)).status, 401);
    const add = await f.action(admin.cookie, 'song.add', {
      title: 'Shared Riff',
      category: 'riff',
      tags: [],
      version: { label: 'v1', audioUrl, duration: 4 },
    });
    assert.equal(add.status, 200, await add.clone().text());
    const { result: song } = await add.json();
    assert.equal(
      (
        await f.action(admin.cookie, 'song.lyrics', {
          songId: song.id,
          draft: 'Shared words',
          chordsSheet: 'Am G',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await f.action(admin.cookie, 'practice.add', {
          title: 'Practice',
          date: '2026-12-01',
          startTime: '18:00',
          endTime: '20:00',
          location: 'Studio',
          setlistSongIds: [song.id],
          goals: [],
          notes: '',
        })
      ).status,
      200,
    );
    const smtp = {
      ...f.store.read().smtpSettings,
      host: 'smtp.example.com',
      password: 'Private-SMTP-secret',
      username: 'mailer',
      fromEmail: 'mail@example.com',
    };
    assert.equal(
      (await f.action(admin.cookie, 'smtp.update', smtp)).status,
      200,
    );
    assert.notEqual(
      f.store.read().smtpSettings.password,
      'Private-SMTP-secret',
    );
    assert.equal(
      (await f.action(admin.cookie, 'smtp.update', { ...smtp, password: '' }))
        .status,
      200,
    );
    await f.restart();
    const state = await (
      await f.request('/api/state', undefined, admin.cookie)
    ).json();
    assert.equal(state.songs[0].lyrics.draft, 'Shared words');
    assert.equal(state.practices.length, 1);
    assert.equal(state.smtpSettings.password, '');
    assert.ok(!JSON.stringify(state).includes('Private-SMTP-secret'));
    const audio = await f.request(audioUrl, undefined, admin.cookie, {
      headers: { Range: 'bytes=0-3' },
    });
    assert.equal(audio.status, 206);
    assert.equal(audio.headers.get('content-range'), 'bytes 0-3/15');
    assert.equal(await audio.text(), 'RIFF');
    assert.equal(
      (
        await f.request(audioUrl, undefined, admin.cookie, {
          headers: { Range: 'bytes=999-' },
        })
      ).status,
      416,
    );
    const target = path.join(f.directory, 'backup.sqlite');
    await backup(f.store.db, target);
    const restored = new DatabaseSync(target, { readOnly: true });
    assert.equal(
      restored.prepare('SELECT count(*) AS total FROM uploads').get()!.total,
      1,
    );
    restored.close();
    assert.equal(
      (await f.action(admin.cookie, 'song.delete', { songId: song.id })).status,
      200,
    );
    assert.equal(
      (await f.request(audioUrl, undefined, admin.cookie)).status,
      404,
    );
    assert.equal(f.store.read().practices[0].setlistSongIds.length, 0);
    assert.equal(existsSync(audioPath), false);
  } finally {
    await f.close();
  }
});

test('legacy SQLite audio migrates safely and keeps its playback URL', async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    const id = '11111111-1111-4111-8111-111111111111';
    // Recreate the v1 uploads table to exercise an existing deployment upgrade.
    f.store.db.exec(
      'ALTER TABLE uploads DROP COLUMN relative_path; UPDATE schema_version SET version=1;',
    );
    f.store.db
      .prepare('INSERT INTO uploads VALUES (?,?,?,?,?)')
      .run(
        id,
        admin.state.currentUser.id,
        'audio/mpeg',
        Buffer.from('legacy audio'),
        Date.now(),
      );
    const state = f.store.read();
    state.songs.push({
      id: 'legacy-song',
      title: 'Legacy',
      category: 'bass',
      tags: [],
      activeVersionId: 'legacy-version',
      versions: [
        {
          id: 'legacy-version',
          versionNumber: 1,
          label: 'v1',
          audioUrl: `/api/uploads/${id}`,
          duration: 1,
          uploadedBy: {
            id: admin.state.currentUser.id,
            name: 'Band Admin',
            avatar: '',
          },
          uploadedAt: new Date().toISOString(),
        },
      ],
      lyrics: {
        draft: '',
        lastEditedBy: 'Band Admin',
        lastEditedAt: new Date().toISOString(),
        versionNumber: 1,
      },
      comments: [],
      createdAt: new Date().toISOString(),
      createdBy: {
        id: admin.state.currentUser.id,
        name: 'Band Admin',
        avatar: '',
      },
    });
    f.store.write(state);
    await f.restart();
    const row = f.store.db
      .prepare(
        'SELECT relative_path,length(data) AS bytes FROM uploads WHERE id=?',
      )
      .get(id)!;
    assert.equal(row.relative_path, `Band_Admin/bass/${id}.mp3`);
    assert.equal(row.bytes, 0);
    assert.equal(
      readFileSync(
        path.join(f.options.mediaDirectory!, String(row.relative_path)),
      ).toString(),
      'legacy audio',
    );
    assert.equal(
      await (
        await f.request(`/api/uploads/${id}`, undefined, admin.cookie)
      ).text(),
      'legacy audio',
    );
    await f.restart();
    assert.equal(
      await (
        await f.request(`/api/uploads/${id}`, undefined, admin.cookie)
      ).text(),
      'legacy audio',
    );
    const invalid = await f.request(
      '/api/uploads?category=../../escape',
      undefined,
      admin.cookie,
      {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: Buffer.from('audio'),
      },
    );
    assert.equal(invalid.status, 400);
    assert.equal(existsSync(path.join(f.directory, 'escape')), false);
  } finally {
    await f.close();
  }
});
