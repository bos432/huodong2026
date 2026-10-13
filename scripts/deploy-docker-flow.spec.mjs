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

async function verifyDockerFixture(change) {
  const root = '/www/wwwroot/rd.chaimen666.com';
  const commit = '12345678'.padEnd(40, '0');
  const baseline = [
    { id: 'old-api', name: '/activity-api', startedAt: 'first', status: 'running', restarts: 0 },
    { id: 'mysql', name: '/activity-mysql', startedAt: 'database', status: 'running', restarts: 0 },
    { id: 'other', name: '/other-service', startedAt: 'other', status: 'running', restarts: 0 }
  ];
  const current = [{ ...baseline[0], id: 'candidate-api' }, baseline[1], { ...baseline[2], ...change }];
  const commands = [];
  const forbidden = () => { throw new Error('Unexpected mutation in verify mode'); };
  const context = createContext({
    process: { cwd: () => root, argv: ['node', 'deploy', 'verify'], env: { RELEASE_ID: '20261013-12345678', DEPLOY_RUNTIME: 'docker', DB_NETWORK_CONTAINER: 'activity-api' } },
    console: { log() {}, error() {} },
    setTimeout
  });
  const sources = {
    'node:fs/promises': { default: { readFile: async filename => {
      if (filename.endsWith('/release.json')) return JSON.stringify({ commit, files: {} });
      if (filename.endsWith('/baseline.json')) return JSON.stringify({ runtime: 'docker', processes: baseline });
      throw new Error(`Unexpected read: ${filename}`);
    } } },
    'node:fs': { createWriteStream: forbidden },
    'node:path': { default: path.posix },
    'node:module': { createRequire: () => forbidden },
    'node:child_process': { spawn: forbidden, execFileSync: (command, args) => {
      commands.push({ command, args });
      if (command === 'docker' && args[0] === 'inspect' && args[1] === 'activity-api') return JSON.stringify([{ Name: '/activity-api', State: { Running: true }, Config: { Labels: { 'com.docker.compose.project': 'rdchaimen666com', 'com.docker.compose.service': 'api' } } }]);
      if (command === 'docker' && args[0] === 'inspect' && args[1] === 'activity-nginx') return JSON.stringify([{ Mounts: [{ Type: 'bind', Destination: '/usr/share/nginx/admin', Source: `${root}/admin-static` }, { Type: 'bind', Destination: '/usr/share/nginx/h5', Source: `${root}/h5-static` }] }]);
      if (command === 'docker' && args[0] === 'ps') return 'candidate-api\nmysql\nother';
      if (command === 'docker' && args[0] === 'inspect' && args[1] === '--format') return current.map(row => JSON.stringify(row)).join('\n');
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
  await module.evaluate();
  return commands;
}

test('Docker verify runs with no PM2 installed and does not issue any mutation command', async () => {
  const commands = await verifyDockerFixture({});
  assert(commands.some(row => row.command === 'docker' && row.args[0] === 'ps'));
  assert(!commands.some(row => /pm2|node/.test(row.command) || row.args.includes('up')));
});

test('Docker verify rejects unrelated container recreation and restart', async () => {
  await assert.rejects(verifyDockerFixture({ id: 'unexpected-new' }), /other-service/);
  await assert.rejects(verifyDockerFixture({ startedAt: 'unexpected-restart' }), /other-service/);
});
