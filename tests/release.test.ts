import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('release script validates safely and updates every version source before tagging', () => {
  const bash =
    process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
  const directory = mkdtempSync(path.join(tmpdir(), 'rehearsalhq-release-test-'));
  const run = (command: string, args: string[]) =>
    spawnSync(command, args, { cwd: directory, encoding: 'utf8' });
  const git = (...args: string[]) => {
    const result = run('git', args);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const release = (...args: string[]) =>
    run(bash, ['scripts/release.sh', ...args]);
  const lock = (version: string) => ({
    name: 'release-test',
    version,
    lockfileVersion: 3,
    requires: true,
    packages: { '': { name: 'release-test', version } },
  });
  try {
    mkdirSync(path.join(directory, 'scripts'));
    mkdirSync(path.join(directory, 'server'));
    mkdirSync(path.join(directory, 'src/utils'), { recursive: true });
    copyFileSync(
      fileURLToPath(new URL('../scripts/release.sh', import.meta.url)),
      path.join(directory, 'scripts/release.sh'),
    );
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({
        name: 'release-test',
        version: '0.0.0',
        private: true,
        scripts: {
          lint: 'node -e "process.exit(0)"',
          test: 'node -e "process.exit(0)"',
          build: 'node -e "process.exit(0)"',
        },
      }),
    );
    writeFileSync(
      path.join(directory, 'package-lock.json'),
      JSON.stringify(lock('0.0.0')),
    );
    writeFileSync(
      path.join(directory, 'server/app.ts'),
      "const CURRENT_APP_VERSION = '0.0.0';\n",
    );
    writeFileSync(
      path.join(directory, 'src/utils/versionService.ts'),
      "export const CURRENT_APP_VERSION = '0.0.0';\n",
    );
    git('init', '-b', 'main');
    git('config', 'user.name', 'Release test');
    git('config', 'user.email', 'release-test@example.invalid');
    git('config', 'core.autocrlf', 'false');
    git('config', 'commit.gpgSign', 'false');
    git('config', 'tag.gpgSign', 'false');
    git('add', '.');
    git('commit', '-m', 'Initial fixture');
    const originalHead = git('rev-parse', 'HEAD');
    for (const version of ['1.0', '01.0.0', '1.0.0-01', '1.0.0+build'])
      assert.notEqual(release('--check', version).status, 0);
    assert.equal(release('--check', 'v1.0.0').status, 0);
    assert.equal(git('rev-parse', 'HEAD'), originalHead);
    assert.equal(git('tag'), '');
    assert.equal(git('status', '--porcelain'), '');
    writeFileSync(path.join(directory, 'untracked.txt'), 'unfinished work');
    assert.match(
      release('--check', '1.0.0').stderr,
      /including untracked files/,
    );
    rmSync(path.join(directory, 'untracked.txt'));
    git('checkout', '-b', 'dev');
    assert.match(release('--check', '1.0.0').stderr, /release from main/);
    git('checkout', 'main');
    writeFileSync(
      path.join(directory, 'package-lock.json'),
      JSON.stringify(lock('9.0.0')),
    );
    git('add', 'package-lock.json');
    git('commit', '-m', 'Broken lockfile fixture');
    assert.match(release('--check', '1.0.0').stderr, /out of sync/);
    writeFileSync(
      path.join(directory, 'package-lock.json'),
      JSON.stringify(lock('0.0.0')),
    );
    git('add', 'package-lock.json');
    git('commit', '-m', 'Restore fixture');
    writeFileSync(
      path.join(directory, 'server/app.ts'),
      "const CURRENT_APP_VERSION = '9.0.0';\n",
    );
    git('add', 'server/app.ts');
    git('commit', '-m', 'Broken application version fixture');
    assert.match(
      release('--check', '1.0.0').stderr,
      /server\/app\.ts reports 9\.0\.0/,
    );
    writeFileSync(
      path.join(directory, 'server/app.ts'),
      "const CURRENT_APP_VERSION = '0.0.0';\n",
    );
    git('add', 'server/app.ts');
    git('commit', '-m', 'Restore application version fixture');
    const result = release('--no-publish', '1.0.0');
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(
      JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'))
        .version,
      '1.0.0',
    );
    const updated = JSON.parse(
      readFileSync(path.join(directory, 'package-lock.json'), 'utf8'),
    );
    assert.equal(updated.version, '1.0.0');
    assert.equal(updated.packages[''].version, '1.0.0');
    assert.match(
      readFileSync(path.join(directory, 'server/app.ts'), 'utf8'),
      /CURRENT_APP_VERSION = '1\.0\.0'/,
    );
    assert.match(
      readFileSync(
        path.join(directory, 'src/utils/versionService.ts'),
        'utf8',
      ),
      /CURRENT_APP_VERSION = '1\.0\.0'/,
    );
    assert.equal(git('cat-file', '-t', 'v1.0.0'), 'tag');
    assert.equal(git('rev-parse', 'v1.0.0^{}'), git('rev-parse', 'HEAD'));
    assert.equal(git('status', '--porcelain'), '');
    assert.match(release('--check', '1.0.0').stderr, /already exists/);
    assert.equal(release('--check', '1.1.0-beta.1').status, 0);
    assert.equal(existsSync(path.join(directory, 'node_modules')), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
