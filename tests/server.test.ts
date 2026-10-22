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
import { memberDisplayName } from '../src/shared/member.ts';
import { formatClockTime } from '../src/shared/time.ts';
import {
  prepareEmailForDelivery,
  renderBrandedEmail,
} from '../server/emailTemplates.ts';
import {
  googleCalendarUrl,
  outlookCalendarUrl,
  practiceCalendarIcs,
  yahooCalendarUrl,
} from '../src/shared/calendar.ts';

const password = 'Correct-Horse-123!';

test('member display names prefer a trimmed stage name with full-name fallback', () => {
  assert.equal(memberDisplayName({ name: 'Alex Smith' }), 'Alex Smith');
  assert.equal(
    memberDisplayName({ name: 'Alex Smith', stageName: '   ' }),
    'Alex Smith',
  );
  assert.equal(
    memberDisplayName({ name: 'Alex Smith', stageName: '  Ace  ' }),
    'Ace',
  );
});

test('clock times support 12-hour and 24-hour display', () => {
  assert.equal(formatClockTime('00:05', '12'), '12:05 AM');
  assert.equal(formatClockTime('15:30', '12'), '3:30 PM');
  assert.equal(formatClockTime('15:30', '24'), '15:30');
});

test('notification emails use branded, escaped HTML with a useful text alternative', () => {
  const email = renderBrandedEmail(
    {
      bandName: 'Test & Band',
      subtitle: "The band's home base.",
      appUrl: 'https://rehearsal.example.com',
      appSettings: { primaryColor: 'custom', customColor: '#22c55e' },
    },
    {
      preheader: 'A new demo is ready.',
      eyebrow: 'New demo uploaded',
      title: '<Final Demo>',
      greeting: 'Dougie',
      intro: 'A new recording was added.',
      details: [
        { label: 'Tempo', value: '128 BPM' },
        { label: 'Key', value: 'E minor' },
      ],
      callout: { label: 'Notes', text: '<script>unsafe</script>' },
      ctaLabel: 'Listen now',
    },
  );
  assert.match(email.html, /background:#22c55e/);
  assert.match(email.html, /Test &amp; Band/);
  assert.match(email.html, /&lt;Final Demo&gt;/);
  assert.ok(!email.html.includes('<script>unsafe</script>'));
  assert.match(email.html, /Manage notification preferences/);
  assert.match(email.html, /alt="RehearsalHQ"/);
  assert.match(email.text, /Tempo: 128 BPM/);
  assert.match(email.text, /Key: E minor/);
  assert.match(email.text, /Listen now: https:\/\/rehearsal\.example\.com/);
  const preparedFallback = prepareEmailForDelivery(email.html);
  assert.match(preparedFallback.html, /src="cid:rehearsalhq-logo-1"/);
  assert.equal(preparedFallback.attachments[0].contentType, 'image/svg+xml');

  const customLogo = renderBrandedEmail(
    {
      bandName: 'Logo Band',
      subtitle: 'Custom identity',
      appUrl: 'https://rehearsal.example.com',
      appSettings: {
        primaryColor: 'amber',
        headerLogoUrl: 'data:image/png;base64,aGVhZGVy',
        headerLogoShape: 'circle',
        accentGlow: true,
      },
    },
    {
      preheader: 'Logo test',
      eyebrow: 'Branding',
      title: 'Custom logo',
      intro: 'Testing the configured logo.',
      ctaLabel: 'Open app',
    },
  );
  assert.match(customLogo.html, /src="data:image\/png;base64,aGVhZGVy"/);
  assert.match(customLogo.html, /border-radius:999px/);
  assert.match(customLogo.html, /box-shadow:0 0 18px/);
  const preparedCustom = prepareEmailForDelivery(customLogo.html);
  assert.match(preparedCustom.html, /src="cid:rehearsalhq-logo-1"/);
  assert.equal(preparedCustom.attachments[0].contentType, 'image/png');
});

test('practice calendar links preserve local event times and details', () => {
  const practice = {
    id: 'practice-1',
    title: 'Full Band Practice',
    date: '2026-12-02',
    startTime: '18:30',
    endTime: '20:30',
    location: 'Studio B',
    notes: 'Bring ear protection',
    goals: ['Run intro, chorus', 'Tighten ending'],
  };
  const google = new URL(googleCalendarUrl(practice));
  assert.equal(google.searchParams.get('text'), practice.title);
  assert.equal(
    google.searchParams.get('dates'),
    '20261202T183000/20261202T203000',
  );
  assert.equal(google.searchParams.get('location'), practice.location);
  const outlook = new URL(outlookCalendarUrl(practice));
  assert.equal(outlook.searchParams.get('subject'), practice.title);
  assert.equal(outlook.searchParams.get('startdt'), '2026-12-02T18:30:00');
  const yahoo = new URL(yahooCalendarUrl(practice));
  assert.equal(yahoo.searchParams.get('title'), practice.title);
  assert.equal(yahoo.searchParams.get('st'), '20261202T183000');

  const ics = practiceCalendarIcs(
    practice,
    new Date('2026-10-21T12:00:00.000Z'),
  );
  assert.match(ics, /DTSTART:20261202T183000\r\n/);
  assert.match(ics, /DTEND:20261202T203000\r\n/);
  assert.match(ics, /LOCATION:Studio B\r\n/);
  assert.match(ics, /Run intro\\, chorus/);
});

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

const decodeEmail = (message: string) =>
  message
    .replace(/=\r\n/g, '')
    .replace(/=([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );

async function waitForMessages(messages: string[], count: number) {
  const deadline = Date.now() + 3000;
  while (messages.length < count && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(messages.length, count, `Expected ${count} email messages.`);
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
    const message = decodeEmail(smtp.messages[0]);
    assert.match(message, /To: Invited Member <invite@example.com>/);
    assert.match(message, /http:\/\/localhost:3000/);
    assert.match(message, /Band invitation/);
    assert.match(message, /Test Band/);
    assert.match(message, /Content-Type: text\/plain/);
    assert.match(message, /Content-Type: text\/html/);
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

test('action notifications include branded song, feedback, and rehearsal details', async () => {
  const f = await fixture();
  const smtp = await localSmtp();
  try {
    const admin = await f.login();
    const member = {
      name: 'Band Listener',
      email: 'listener@example.com',
      password,
      role: 'member',
      instrument: 'Bass',
    };
    assert.equal(
      (await f.action(admin.cookie, 'member.add', member)).status,
      200,
    );
    const smtpSettings = {
      ...f.store.read().smtpSettings,
      isEnabled: true,
      host: '127.0.0.1',
      port: smtp.port,
      encryption: 'none' as const,
      authRequired: false,
      username: '',
      password: '',
      fromEmail: 'band@example.com',
    };
    assert.equal(
      (await f.action(admin.cookie, 'smtp.update', smtpSettings)).status,
      200,
    );

    const uploadAudio = async (contents: string, category = 'riff') => {
      const upload = await f.request(
        `/api/uploads?category=${category}`,
        undefined,
        admin.cookie,
        {
          method: 'POST',
          headers: { 'Content-Type': 'audio/wav' },
          body: Buffer.from(contents),
        },
      );
      assert.equal(upload.status, 201, await upload.clone().text());
      return (await upload.json()).audioUrl as string;
    };

    const initialAudioUrl = await uploadAudio('RIFF-initial');
    const added = await f.action(admin.cookie, 'song.add', {
      title: 'Midnight Drive',
      category: 'riff',
      bpm: 128,
      musicalKey: 'E minor',
      description: 'Focus on the transition into the second chorus.',
      tags: [],
      version: {
        label: 'v1 - Phone Demo',
        audioUrl: initialAudioUrl,
        duration: 95,
      },
    });
    assert.equal(added.status, 200, await added.clone().text());
    const song = (await added.json()).result;
    await waitForMessages(smtp.messages, 1);
    const demoEmail = decodeEmail(smtp.messages[0]);
    assert.match(demoEmail, /New demo uploaded/);
    assert.match(demoEmail, /Midnight Drive/);
    assert.match(demoEmail, /128 BPM/);
    assert.match(demoEmail, /E minor/);
    assert.match(demoEmail, /second chorus/);
    assert.match(demoEmail, /Listen in RehearsalHQ/);
    assert.match(demoEmail, /Content-ID: <rehearsalhq-logo-1>/);

    const nextAudioUrl = await uploadAudio('RIFF-second');
    assert.equal(
      (
        await f.action(admin.cookie, 'song.version', {
          songId: song.id,
          version: {
            label: 'v2 - Full Band',
            audioUrl: nextAudioUrl,
            duration: 124,
            fileSize: '4.2 MB',
            notes: 'New drum ending and a tighter count-in.',
          },
        })
      ).status,
      200,
    );
    await waitForMessages(smtp.messages, 2);
    const versionEmail = decodeEmail(smtp.messages[1]);
    assert.match(versionEmail, /New recording take/);
    assert.match(versionEmail, /v2 - Full Band/);
    assert.match(versionEmail, /2:04/);
    assert.match(versionEmail, /New drum ending/);

    assert.equal(
      (
        await f.action(admin.cookie, 'song.lyrics', {
          songId: song.id,
          draft: 'Updated words',
        })
      ).status,
      200,
    );
    await waitForMessages(smtp.messages, 3);
    const lyricsEmail = decodeEmail(smtp.messages[2]);
    assert.match(lyricsEmail, /Lyrics updated/);
    assert.match(lyricsEmail, /Review lyrics/);

    assert.equal(
      (
        await f.action(admin.cookie, 'song.chords', {
          songId: song.id,
          chordsSheet: 'Em C G D',
        })
      ).status,
      200,
    );
    await waitForMessages(smtp.messages, 4);
    const chordsEmail = decodeEmail(smtp.messages[3]);
    assert.match(chordsEmail, /Chord chart updated/);
    assert.match(chordsEmail, /Review chord chart/);

    assert.equal(
      (
        await f.action(admin.cookie, 'song.comment', {
          songId: song.id,
          text: 'The harmony lands perfectly here.',
          timestampSeconds: 62,
        })
      ).status,
      200,
    );
    await waitForMessages(smtp.messages, 5);
    const commentEmail = decodeEmail(smtp.messages[4]);
    assert.match(commentEmail, /New band feedback/);
    assert.match(commentEmail, /1:02/);
    assert.match(commentEmail, /harmony lands perfectly/);

    assert.equal(
      (
        await f.action(admin.cookie, 'practice.add', {
          title: 'Album Run-through',
          date: '2026-12-05',
          startTime: '18:30',
          endTime: '21:00',
          location: 'Studio B',
          room: 'Live Room',
          setlistSongIds: [song.id],
          goals: ['Run the complete set', 'Fix the ending'],
          notes: 'Bring in-ear monitors.',
        })
      ).status,
      200,
    );
    await waitForMessages(smtp.messages, 6);
    const practiceEmail = decodeEmail(smtp.messages[5]);
    assert.match(practiceEmail, /New rehearsal/);
    assert.match(practiceEmail, /Album Run-through/);
    assert.match(practiceEmail, /Studio B/);
    assert.match(practiceEmail, /Live Room/);
    assert.match(practiceEmail, /Midnight Drive/);
    assert.match(practiceEmail, /Bring in-ear monitors/);
    assert.match(practiceEmail, /View practice and RSVP/);

    assert.equal(
      (
        await f.action(admin.cookie, 'song.archive', {
          songId: song.id,
        })
      ).status,
      200,
    );
    await waitForMessages(smtp.messages, 7);
    const archiveEmail = decodeEmail(smtp.messages[6]);
    assert.match(archiveEmail, /Demo archived/);
    assert.match(archiveEmail, /Midnight Drive/);
    assert.match(archiveEmail, /permanently deleted in 30 days/i);
    assert.match(archiveEmail, /Download its ZIP archive before deletion/i);
    assert.match(archiveEmail, /audio takes, lyrics, chords, and tabs/i);
    assert.equal(f.store.read().emailLogs[0].eventType, 'demo_archived');
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
    sendPracticeReminders: (referenceTime?: Date) =>
      application.sendPracticeReminders(referenceTime),
    cleanupArchivedDemos: (referenceTime?: Date) =>
      application.cleanupArchivedDemos(referenceTime),
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

test('RSVP reminders target unconfirmed members and event reminders target attendees', async () => {
  const f = await fixture();
  const smtp = await localSmtp();
  try {
    const admin = await f.login();
    assert.equal(
      (
        await f.action(admin.cookie, 'member.add', {
          name: 'Unconfirmed Member',
          email: 'unconfirmed@example.com',
          password,
          role: 'member',
          instrument: 'Bass',
        })
      ).status,
      200,
    );
    const smtpSettings = {
      ...f.store.read().smtpSettings,
      isEnabled: true,
      host: '127.0.0.1',
      port: smtp.port,
      encryption: 'none' as const,
      authRequired: false,
      username: '',
      password: '',
      fromEmail: 'band@example.com',
      notificationTriggers: {
        ...f.store.read().smtpSettings.notificationTriggers,
        practiceSchedule: false,
        practiceReminder: true,
      },
    };
    assert.equal(
      (await f.action(admin.cookie, 'smtp.update', smtpSettings)).status,
      200,
    );
    assert.equal(
      (
        await f.action(admin.cookie, 'practice.add', {
          title: 'Tomorrow Practice',
          date: '2026-12-02',
          startTime: '18:00',
          endTime: '20:00',
          location: 'Studio A',
          setlistSongIds: [],
          goals: [],
          notes: '',
        })
      ).status,
      200,
    );

    const startsAt = new Date(2026, 11, 2, 18, 0, 0);
    const withinWindow = new Date(
      startsAt.getTime() - 23 * 60 * 60 * 1000,
    );
    assert.equal(await f.sendPracticeReminders(withinWindow), 2);
    assert.equal(smtp.messages.length, 2);
    assert.match(smtp.messages[0], /unconfirmed@example\.com/);
    assert.match(smtp.messages[0], /Tomorrow Practice/);
    assert.equal(await f.sendPracticeReminders(withinWindow), 0);
    assert.equal(smtp.messages.length, 2);
    const finalWindow = new Date(
      startsAt.getTime() - 3 * 60 * 60 * 1000,
    );
    assert.equal(await f.sendPracticeReminders(finalWindow), 1);
    assert.equal(smtp.messages.length, 3);
    assert.match(smtp.messages[2], /4 hours/);
    assert.equal(await f.sendPracticeReminders(finalWindow), 0);
    assert.equal(
      f.store.read().emailLogs[0].eventType,
      'practice_event_reminder',
    );
  } finally {
    await smtp.close();
    await f.close();
  }
});

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
    assert.equal(anonymous.appSettings.timeFormat, '12');
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
            accentGlow: false,
          })
        ).status,
        400,
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
    assert.equal(
      (await f.action(admin.cookie, 'app.update', { accentGlow: false })).status,
      200,
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
    assert.equal(guestState.appSettings.accentGlow, false);
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
    assert.equal(upgraded.appSettings.accentGlow, false);
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
    assert.equal(
      (
        await f.action(guest.cookie, 'song.update', {
          songId: 'missing-song',
          title: 'Unauthorized edit',
          category: 'idea',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.action(guest.cookie, 'song.tabs', {
          songId: 'missing-song',
          tuning: 'E A D G B E',
          content: 'e|---|',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.action(guest.cookie, 'song.chords', {
          songId: 'missing-song',
          chordsSheet: 'Am G',
        })
      ).status,
      403,
    );
    const branding = {
      headerLogoUrl: 'data:image/png;base64,aGVhZGVy',
      headerLogoShape: 'circle',
      headerSubtitle: 'Admin header',
      timeFormat: '24',
    };
    assert.equal(
      (await f.action(admin.cookie, 'app.update', branding)).status,
      200,
    );
    const demoCategories = [
      { id: 'all', label: 'All Demos' },
      { id: 'idea', label: 'Song Ideas' },
      { id: 'chorus', label: 'Chorus Ideas' },
      { id: 'riff', label: 'Riffs' },
      { id: 'bass', label: 'Bass Ideas' },
      { id: 'verse', label: 'Verse Ideas' },
      { id: 'bridge', label: 'Bridge Ideas' },
      { id: 'full', label: 'Full Arrangements' },
      { id: 'archived', label: 'Archived' },
    ];
    assert.equal(
      (
        await f.action(admin.cookie, 'app.update', {
          demoCategories,
        })
      ).status,
      200,
    );
    assert.deepEqual(f.store.read().appSettings.demoCategories, demoCategories);
    assert.equal(
      (
        await f.action(admin.cookie, 'app.update', {
          demoCategories: [
            { id: 'all', label: 'All Demos' },
            { id: 'idea', label: 'All Demos' },
          ],
        })
      ).status,
      400,
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
    assert.equal(f.store.read().appSettings.timeFormat, '24');
    assert.equal(
      (await f.action(admin.cookie, 'app.update', { timeFormat: 'military' }))
        .status,
      400,
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
    assert.equal(
      (
        await f.action(admin.cookie, 'member.profile', {
          userId: admin.state.currentUser.id,
          updates: { stageName: '  The Conductor  ' },
        })
      ).status,
      200,
    );
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
    assert.equal(song.createdBy.name, 'The Conductor');
    assert.equal(song.versions[0].uploadedBy.name, 'The Conductor');
    const metadataUpdate = await f.action(admin.cookie, 'song.update', {
      songId: song.id,
      title: 'Finished Demo',
      category: 'full',
      bpm: 132,
      musicalKey: 'D minor',
      description: 'Use the quieter intro.',
    });
    assert.equal(metadataUpdate.status, 200, await metadataUpdate.clone().text());
    const updatedSong = (await metadataUpdate.json()).state.songs[0];
    assert.equal(updatedSong.title, 'Finished Demo');
    assert.equal(updatedSong.category, 'full');
    assert.equal(updatedSong.bpm, 132);
    assert.equal(updatedSong.musicalKey, 'D minor');
    assert.equal(updatedSong.description, 'Use the quieter intro.');
    const earlyChordChart = await f.action(admin.cookie, 'song.chords', {
      songId: song.id,
      chordsSheet: 'Am G',
    });
    assert.equal(earlyChordChart.status, 400);
    assert.match(await earlyChordChart.text(), /Add lyrics in Lyrics Studio/);
    assert.equal(
      (
        await f.action(admin.cookie, 'song.comment', {
          songId: song.id,
          text: 'Keep this take',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await f.action(admin.cookie, 'song.lyrics', {
          songId: song.id,
          draft: 'Shared words',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await f.action(admin.cookie, 'song.chords', {
          songId: song.id,
          chordsSheet: 'Am G',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await f.action(admin.cookie, 'song.tabs', {
          songId: song.id,
          tuning: 'D A D G B E',
          content: '[Intro]\ne|--0--2--3--|\nB|-----------|',
        })
      ).status,
      200,
    );
    assert.equal(
      (await f.request(`/api/demos/${song.id}/export`)).status,
      401,
    );
    const bundle = await f.request(
      `/api/demos/${song.id}/export`,
      undefined,
      admin.cookie,
    );
    assert.equal(bundle.status, 200, await bundle.clone().text());
    assert.match(bundle.headers.get('content-type') || '', /application\/zip/);
    assert.match(
      bundle.headers.get('content-disposition') || '',
      /attachment; filename="Finished Demo\.zip"/,
    );
    const bundleBytes = Buffer.from(await bundle.arrayBuffer());
    assert.equal(bundleBytes.subarray(0, 2).toString('ascii'), 'PK');
    const bundleIndex = bundleBytes.toString('latin1');
    assert.match(bundleIndex, /Finished Demo\/Audio\/01_v1\.wav/);
    assert.match(bundleIndex, /Finished Demo\/Lyrics\.txt/);
    assert.match(bundleIndex, /Finished Demo\/Chords\.txt/);
    assert.match(bundleIndex, /Finished Demo\/Tabs\.txt/);
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
    const practiceId = f.store.read().practices[0].id;
    assert.equal(
      (
        await f.action(admin.cookie, 'practice.update', {
          practiceId,
          title: 'Full Band Practice',
          date: '2026-12-02',
          startTime: '18:30',
          endTime: '20:30',
          location: 'Studio B',
          setlistSongIds: [song.id],
          goals: ['Run the full arrangement'],
          notes: 'Bring ear protection',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await f.action(admin.cookie, 'member.profile', {
          userId: admin.state.currentUser.id,
          updates: { stageName: 'Maestro' },
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
    assert.equal(state.songs[0].lyrics.chordsSheet, 'Am G');
    assert.equal(state.songs[0].tabs.tuning, 'D A D G B E');
    assert.match(state.songs[0].tabs.content, /^\[Intro\]/);
    assert.equal(state.songs[0].tabs.versionNumber, 1);
    assert.equal(state.songs[0].tabs.lastEditedBy, 'The Conductor');
    assert.equal(state.songs[0].title, 'Finished Demo');
    assert.equal(state.songs[0].category, 'full');
    assert.equal(state.songs[0].bpm, 132);
    assert.equal(state.songs[0].musicalKey, 'D minor');
    assert.equal(state.songs[0].description, 'Use the quieter intro.');
    assert.equal(state.songs[0].lyrics.lastEditedBy, 'The Conductor');
    assert.equal(state.songs[0].createdBy.name, 'Maestro');
    assert.equal(state.songs[0].versions[0].uploadedBy.name, 'Maestro');
    assert.equal(state.songs[0].comments[0].userName, 'Maestro');
    assert.equal(state.practices.length, 1);
    assert.equal(state.practices[0].title, 'Full Band Practice');
    assert.equal(state.practices[0].location, 'Studio B');
    assert.deepEqual(state.practices[0].goals, ['Run the full arrangement']);
    assert.equal(state.practices[0].createdBy, 'The Conductor');
    assert.equal(state.practices[0].rsvps[0].userName, 'Maestro');
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
      (await f.action(admin.cookie, 'song.archive', { songId: song.id })).status,
      200,
    );
    assert.equal(f.store.read().songs[0].category, 'archived');
    assert.equal(f.store.read().songs[0].archivedFromCategory, 'full');
    assert.ok(f.store.read().songs[0].archivedAt);
    assert.equal(existsSync(audioPath), true);
    const archivedEdit = await f.action(admin.cookie, 'song.comment', {
      songId: song.id,
      text: 'This should remain read-only.',
    });
    assert.equal(archivedEdit.status, 400);
    assert.match(await archivedEdit.text(), /restore this archived demo/i);
    assert.equal(
      (await f.action(admin.cookie, 'song.restore', { songId: song.id })).status,
      200,
    );
    assert.equal(f.store.read().songs[0].category, 'full');
    assert.equal(f.store.read().songs[0].archivedFromCategory, undefined);
    assert.equal(f.store.read().songs[0].archivedAt, undefined);
    assert.equal(
      (await f.action(admin.cookie, 'song.archive', { songId: song.id })).status,
      200,
    );
    const oldArchiveState = f.store.read();
    oldArchiveState.songs[0].archivedAt = '2026-01-01T00:00:00.000Z';
    f.store.write(oldArchiveState);
    assert.equal(
      (
        await f.action(admin.cookie, 'app.update', {
          autoDeleteArchivedDemos: false,
        })
      ).status,
      200,
    );
    assert.equal(
      f.cleanupArchivedDemos(new Date('2026-02-01T00:00:01.000Z')),
      0,
    );
    assert.equal(f.store.read().songs.length, 1);
    assert.equal(
      (
        await f.action(admin.cookie, 'app.update', {
          autoDeleteArchivedDemos: true,
        })
      ).status,
      200,
    );
    assert.equal(
      f.cleanupArchivedDemos(new Date('2026-02-01T00:00:01.000Z')),
      1,
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
