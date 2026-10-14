import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as runtime from './deploy-runtime.mjs';
import * as migrations from './deploy-migrations.mjs';
import * as releases from './release-metadata.mjs';
import * as databaseIdentity from './deploy-database-identity.mjs';
import * as databaseRuntime from './deploy-database-runtime.mjs';

async function verifyDockerFixture(change, options = {}) {
  const root = '/www/wwwroot/rd.chaimen666.com';
  const commit = '12345678'.padEnd(40, '0');
  const previousCommit = '87654321'.padEnd(40, '0');
  let runningCommit = options.runningCommit || commit;
  const baseline = [
    { id: 'old-api', name: '/activity-api', startedAt: 'first', status: 'running', restarts: 0 },
    { id: 'mysql', name: '/activity-mysql', startedAt: 'database', status: 'running', restarts: 0 },
    { id: 'other', name: '/other-service', startedAt: 'other', status: 'running', restarts: 0 }
  ];
  const current = [{ ...baseline[0], id: 'candidate-api' }, baseline[1], { ...baseline[2], ...change }];
  const commands = [];
  const writes = [];
  const forbidden = () => { throw new Error('Unexpected mutation in verify mode'); };
  const context = createContext({
    process: { cwd: () => root, argv: ['node', 'deploy', options.mode || 'verify'], env: { RELEASE_ID: '20261013-12345678', DEPLOY_RUNTIME: 'docker', DB_NETWORK_CONTAINER: 'activity-api' } },
    console: { log() {}, error() {} },
    setTimeout,
    AbortSignal,
    fetch: async () => ({ ok: true, json: async () => ({ data: { ready: true, release: { commit: runningCommit }, worker: { mode: 'embedded', ready: true } } }) })
  });
  const sources = {
    'node:fs/promises': { default: { readFile: async filename => {
      if (filename.endsWith('/release.json')) return JSON.stringify({ commit, previousCommit, files: {} });
      if (filename.endsWith('/baseline.json')) return JSON.stringify({ runtime: 'docker', processes: baseline });
      if (filename.endsWith('/environment-before.json')) return JSON.stringify([{ target: `${root}/.env`, source: `BUILD_COMMIT=${previousCommit}\n` }]);
      throw new Error(`Unexpected read: ${filename}`);
    }, access: async filename => { if (options.missingBackup && filename.endsWith('/h5/index.html')) throw new Error('Missing static backup'); },
    rename: async (...args) => { writes.push({ operation: 'rename', args }); },
    writeFile: async (...args) => { writes.push({ operation: 'writeFile', args }); },
    mkdir: async (...args) => { writes.push({ operation: 'mkdir', args }); },
    readdir: async () => ['index.html', 'version.json'].map(name => ({ name })),
    copyFile: async (...args) => { writes.push({ operation: 'copyFile', args }); }
    } },
    'node:fs': { createWriteStream: forbidden },
    'node:path': { default: path.posix },
    'node:module': { createRequire: () => forbidden },
    'node:child_process': { spawn: forbidden, execFileSync: (command, args) => {
      commands.push({ command, args });
      if (command === 'docker' && args[0] === 'inspect' && args[1] === 'activity-api') return JSON.stringify([{ Name: '/activity-api', State: { Running: true }, Config: { Labels: { 'com.docker.compose.project': 'rdchaimen666com', 'com.docker.compose.service': 'api' } } }]);
      if (command === 'docker' && args[0] === 'inspect' && args[1] === 'activity-nginx') return JSON.stringify([{ Mounts: [{ Type: 'bind', Destination: '/usr/share/nginx/admin', Source: `${root}/admin-static` }, { Type: 'bind', Destination: '/usr/share/nginx/h5', Source: `${root}/h5-static` }] }]);
      if (command === 'docker' && args[0] === 'ps') return 'candidate-api\nmysql\nother';
      if (command === 'docker' && args[0] === 'inspect' && args[1] === '--format') return current.map(row => JSON.stringify(row)).join('\n');
      if (command === 'docker' && args[0] === 'compose' && options.mode === 'rollback') {
        assert.equal(args.join(' '), 'compose -p rdchaimen666com up -d --no-deps --no-build --force-recreate api');
        runningCommit = previousCommit;
        return 'restored API';
      }
      if (command === 'git' && args.join(' ') === 'rev-parse HEAD') return commit;
      if (command === 'ps') return 'nginx\nmysqld';
      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    } },
    'node:stream/promises': { pipeline: forbidden },
    'node:zlib': { createGzip: forbidden },
    'node:crypto': { createHash },
    './deploy-runtime.mjs': runtime,
    './deploy-migrations.mjs': migrations,
    './release-metadata.mjs': releases,
    './deploy-database-identity.mjs': databaseIdentity,
    './deploy-database-runtime.mjs': databaseRuntime
  };
  const module = new SourceTextModule(await readFile(new URL('./deploy-scoped-release.mjs', import.meta.url), 'utf8'), { context });
  await module.link(specifier => {
    const exports = sources[specifier];
    if (!exports) throw new Error(`Unexpected import: ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  try { await module.evaluate(); } catch (error) { error.fixtureWrites = writes; throw error; }
  return { commands, writes };
}

test('Docker verify runs with no PM2 installed and does not issue any mutation command', async () => {
  const { commands } = await verifyDockerFixture({});
  assert(commands.some(row => row.command === 'docker' && row.args[0] === 'ps'));
  assert(!commands.some(row => /pm2|node/.test(row.command) || row.args.includes('up')));
});

test('Docker rollback restores only owned API/static/config and never reverts migrations', async () => {
  const { commands, writes } = await verifyDockerFixture({}, { mode: 'rollback' });
  assert.equal(commands.filter(row => row.command === 'docker' && row.args[0] === 'compose').length, 1);
  assert(writes.some(row => row.operation === 'rename' && row.args[0].endsWith('/apps/api/dist')));
  assert(writes.some(row => row.operation === 'copyFile' && row.args[0].endsWith('/static-backup/h5/index.html')));
  const record = writes.find(row => row.operation === 'writeFile' && row.args[0].endsWith('/rollback-complete.json'));
  assert.equal(JSON.parse(record.args[1]).databaseMigrationsRetained, true);
  assert(!commands.some(row => row.args.includes('run') || row.args.includes('exec')));
});

test('Docker rollback refuses an unexpected release or missing backup before mutation', async () => {
  for (const options of [{ mode: 'rollback', runningCommit: 'unexpected' }, { mode: 'rollback', missingBackup: true }]) {
    await assert.rejects(verifyDockerFixture({}, options), error => {
      assert.equal(error.fixtureWrites.length, 0);
      return /unexpected|Missing static backup/.test(error.message);
    });
  }
});

test('Docker verify rejects unrelated container recreation and restart', async () => {
  await assert.rejects(verifyDockerFixture({ id: 'unexpected-new' }), /other-service/);
  await assert.rejects(verifyDockerFixture({ startedAt: 'unexpected-restart' }), /other-service/);
});
