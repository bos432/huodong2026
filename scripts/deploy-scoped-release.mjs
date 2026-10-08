import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { createHash } from 'node:crypto';
import { isReleaseId, releaseIdentifiersMatch } from './release-metadata.mjs';
import { isAllowedDatabaseIdentity } from './deploy-database-identity.mjs';
import { getContainerDatabaseRuntime } from './deploy-database-runtime.mjs';

const root = '/www/wwwroot/rd.chaimen666.com';
const releaseId = process.env.RELEASE_ID;
const mode = process.argv[2];
if (process.cwd() !== root || !isReleaseId(releaseId) || !['prepare', 'migrate', 'publish', 'verify'].includes(mode)) throw new Error('Expected scoped project, release ID and explicit mode.');
const privateDir = `/www/backup/activity-releases/${releaseId}`;
const bundle = path.join(privateDir, 'bundle');
const nextApi = path.join(root, 'apps/api', `.release-${releaseId}`, 'dist');
const require = createRequire(path.join(root, 'apps/api/package.json'));
const manifest = JSON.parse(await fs.readFile(path.join(bundle, 'release.json'), 'utf8'));
const expectedMigrations = [
  'ActivityOperationVersions1788566400000', 'ActivitySeries1788652800000',
  'ActivityFollowups1788652900000', 'ActivityTestFlag1788653000000',
  'SocialConnections1788653100000', 'AiOperationDrafts1788653200000',
  'CreateReleaseReadinessCenter1788653500000',
  'AddRefundFailureReason1788653600000'
];
const pm2 = '/www/server/nodejs/v22.22.3/lib/node_modules/pm2/bin/pm2';
const node = '/www/server/nodejs/v22.22.3/bin/node';
const databaseRuntime = getContainerDatabaseRuntime(process.env);
function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options }).trim();
}
function processes() { return JSON.parse(run(node, [pm2, 'jlist'])); }
function publicProcesses(rows) { return rows.map(row => ({ id: row.pm_id, name: row.name, pid: row.pid, status: row.pm2_env.status, restarts: row.pm2_env.restart_time, script: row.pm2_env.pm_exec_path })); }
function ownedProcesses(rows) {
  return ['activity-api', 'activity-worker'].map(name => {
    const matches = rows.filter(row => row.name === name);
    const expected = `${root}/apps/api/dist/${name === 'activity-api' ? 'main' : 'worker'}.js`;
    if (matches.length !== 1 || matches[0].pm2_env.pm_exec_path !== expected || matches[0].pm2_env.pm_cwd !== root) throw new Error(`Process ownership mismatch: ${name}`);
    return matches[0];
  });
}
async function databaseAt(directory) {
  const database = require(path.join(directory, 'data-source.js')).default;
  if (!isAllowedDatabaseIdentity(database.options)) throw new Error('Database identity mismatch.');
  await database.initialize();
  return database;
}
function databaseOptionsFromEnvironment() {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };
}
function runContainerDatabase(directory, mode) {
  if (!databaseRuntime) throw new Error('Container database runtime is not configured.');
  const expected = JSON.stringify(expectedMigrations);
  const script = `const d=require('./apps/api/dist/data-source.js').default; const {MigrationExecutor}=require('${databaseRuntime.typeormPath}'); (async()=>{await d.initialize(); const e=new MigrationExecutor(d); const p=await e.getPendingMigrations(); const expected=${expected}; if(${JSON.stringify(mode)}==='prepare'){console.log(JSON.stringify({pending:p.map(x=>x.name)}));}else{const expectedPending=expected.slice(Math.max(0,expected.length-p.length)); if(JSON.stringify(p.map(x=>x.name))!==JSON.stringify(expectedPending)) throw new Error('Unexpected pending migrations: '+JSON.stringify(p.map(x=>x.name))); const applied=await d.runMigrations({transaction:'each'}); console.log(JSON.stringify({applied:applied.map(x=>x.name)}));} await d.destroy();})().catch(e=>{console.error(e.message);process.exit(1)})`;
  return JSON.parse(run('docker', [
    'run', '--rm', '--network', `container:${databaseRuntime.container}`, '-i', '-w', '/app',
    '-v', `${directory}:/app/apps/api/dist:ro`,
    '-e', 'DB_HOST', '-e', 'DB_PORT', '-e', 'DB_USERNAME', '-e', 'DB_DATABASE', '-e', 'DB_PASSWORD',
    databaseRuntime.image, 'node', '-e', script,
  ], { env: process.env }));
}
function startDatabaseDump(options) {
  if (!databaseRuntime) {
    return spawn('/usr/bin/mysqldump', ['--single-transaction', '--quick', '--routines', '--triggers', '--events', '--default-character-set=utf8mb4', '-h', options.host, '-P', String(options.port), '-u', options.username, options.database], { env: { ...process.env, MYSQL_PWD: options.password }, stdio: ['ignore', 'pipe', 'pipe'] });
  }
  return spawn('docker', [
    'run', '--rm', '--network', `container:${databaseRuntime.container}`, '-e', 'MYSQL_PWD', 'mysql:8.4', 'mysqldump',
    '--single-transaction', '--quick', '--routines', '--triggers', '--events', '--default-character-set=utf8mb4',
    '-h', options.host, '-P', String(options.port), '-u', options.username, options.database,
  ], { env: { ...process.env, MYSQL_PWD: options.password }, stdio: ['ignore', 'pipe', 'pipe'] });
}
async function writeRecord(name, value) { await fs.writeFile(path.join(privateDir, name), JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' }); }
async function verifyBundle() {
  if (!releaseIdentifiersMatch(manifest.commit, releaseId.slice(9)) || !/^[a-f0-9]{40}$/.test(manifest.commit)) throw new Error('Release metadata mismatch.');
  for (const [relative, expected] of Object.entries(manifest.files)) {
    const filename = path.resolve(bundle, relative);
    if (!filename.startsWith(`${bundle}/`)) throw new Error('Unsafe artifact path.');
    const digest = createHash('sha256').update(await fs.readFile(filename)).digest('hex');
    if (digest !== expected) throw new Error(`Artifact checksum mismatch: ${relative}`);
  }
}
async function publishStatic(source, target) {
  await fs.mkdir(target, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (entry.name === 'index.html' || entry.name === 'version.json') continue;
    await fs.cp(path.join(source, entry.name), path.join(target, entry.name), { recursive: true });
  }
  for (const filename of ['version.json', 'index.html']) {
    await fs.copyFile(path.join(source, filename), path.join(target, `.${filename}.${releaseId}`));
    await fs.rename(path.join(target, `.${filename}.${releaseId}`), path.join(target, filename));
  }
}

await verifyBundle();
ownedProcesses(processes());
if (mode === 'prepare') {
  if (run('git', ['rev-parse', 'HEAD']) !== manifest.previousCommit || run('git', ['status', '--porcelain', '--untracked-files=no'])) throw new Error('Production checkout differs from reviewed baseline.');
  await fs.mkdir(privateDir, { recursive: true, mode: 0o700 });
  await fs.chmod(privateDir, 0o700);
  await writeRecord('baseline.json', { commit: manifest.previousCommit, processes: publicProcesses(processes()), services: run('ps', ['-eo', 'pid,ppid,lstart,comm']) });
  const database = databaseRuntime ? null : await databaseAt(path.join(root, 'apps/api/dist'));
  try {
    const options = databaseRuntime ? databaseOptionsFromEnvironment() : database.options;
    if (!isAllowedDatabaseIdentity(options)) throw new Error('Database identity mismatch.');
    const pending = databaseRuntime
      ? runContainerDatabase(path.join(root, 'apps/api/dist'), 'prepare').pending
      : (await new (require('typeorm').MigrationExecutor)(database).getPendingMigrations()).map(migration => migration.name);
    if (pending.length) throw new Error(`Unexpected historical pending migrations: ${JSON.stringify(pending)}`);
    const dump = startDatabaseDump(options);
    let stderr = '';
    dump.stderr.on('data', chunk => { stderr += chunk; });
    const complete = new Promise((resolve, reject) => { dump.on('error', reject); dump.on('close', code => code === 0 ? resolve() : reject(new Error(`Backup failed: ${stderr}`))); });
    await Promise.all([complete, pipeline(dump.stdout, createGzip(), createWriteStream(path.join(privateDir, 'database.sql.gz'), { flags: 'wx', mode: 0o600 }))]);
    run('gzip', ['-t', path.join(privateDir, 'database.sql.gz')]);
    const paths = ['apps/api/dist', 'apps/admin/dist', 'apps/mobile/dist/build/h5', '.env', 'apps/api/.env'];
    for (const candidate of ['deploy/.env.production', 'uploads/demo-activities']) {
      try { await fs.access(path.join(root, candidate)); paths.push(candidate); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    run('tar', ['-czf', path.join(privateDir, 'previous-artifacts.tar.gz'), ...paths]);
    run('gzip', ['-t', path.join(privateDir, 'previous-artifacts.tar.gz')]);
    await fs.cp(path.join(bundle, 'api'), nextApi, { recursive: true, force: false, errorOnExist: true });
    await writeRecord('backup-complete.json', { time: new Date().toISOString(), database: options.database, previousCommit: manifest.previousCommit });
    console.log('BACKUP_OK; staged API ready; production processes unchanged.');
  } finally { await database?.destroy(); }
} else if (mode === 'migrate') {
  await fs.access(path.join(privateDir, 'backup-complete.json'));
  if (run('git', ['rev-parse', 'HEAD']) !== manifest.commit) throw new Error('Git version mismatch.');
  if (databaseRuntime) {
    const applied = runContainerDatabase(nextApi, 'migrate').applied;
    await writeRecord('migrations-complete.json', { names: applied, time: new Date().toISOString() });
    console.log('MIGRATIONS_OK', JSON.stringify(applied));
  } else {
    const database = await databaseAt(nextApi);
    try {
      const { MigrationExecutor } = require('typeorm');
      const pending = (await new MigrationExecutor(database).getPendingMigrations()).map(migration => migration.name);
      const expectedPending = expectedMigrations.slice(Math.max(0, expectedMigrations.length - pending.length));
      if (JSON.stringify(pending) !== JSON.stringify(expectedPending)) throw new Error(`Unexpected pending migrations: ${JSON.stringify(pending)}`);
      const applied = await database.runMigrations({ transaction: 'each' });
      await writeRecord('migrations-complete.json', { names: applied.map(migration => migration.name), time: new Date().toISOString() });
      console.log('MIGRATIONS_OK', JSON.stringify(applied.map(migration => migration.name)));
    } finally { await database.destroy(); }
  }
} else if (mode === 'publish') {
  await fs.access(path.join(privateDir, 'migrations-complete.json'));
  if (run('git', ['rev-parse', 'HEAD']) !== manifest.commit) throw new Error('Git version mismatch.');
  const rows = ownedProcesses(processes());
  for (const filename of ['.env', 'apps/api/.env', 'deploy/.env.production']) {
    const target = path.join(root, filename);
    let source;
    try { source = await fs.readFile(target, 'utf8'); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const [key, value] of Object.entries({ BUILD_COMMIT: manifest.commit, BUILD_TIME: manifest.buildTime })) {
      const pattern = new RegExp(`^${key}=.*$`, 'gm');
      source = pattern.test(source) ? source.replace(pattern, `${key}=${value}`) : `${source.trimEnd()}\n${key}=${value}\n`;
    }
    await fs.writeFile(`${target}.${releaseId}`, source, { mode: 0o600, flag: 'wx' });
    await fs.rename(`${target}.${releaseId}`, target);
  }
  const previousApi = path.join(root, 'apps/api', `.previous-${releaseId}`);
  await fs.rename(path.join(root, 'apps/api/dist'), previousApi);
  await fs.rename(nextApi, path.join(root, 'apps/api/dist'));
  for (const row of rows.slice().reverse()) {
    run(node, [pm2, 'restart', row.name, '--update-env'], { env: { ...process.env, ...row.pm2_env.env, BUILD_COMMIT: manifest.commit, BUILD_TIME: manifest.buildTime } });
  }
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:18080/api/health/ready', { signal: AbortSignal.timeout(5000) });
      const body = await response.json();
      const health = body.data || body;
      if (response.ok && health.ready && health.release.commit === manifest.commit) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!ready) throw new Error(`New API not ready; frontend not switched. Previous API retained at ${previousApi}; restore before proceeding.`);
  await publishStatic(path.join(bundle, 'admin'), path.join(root, 'apps/admin/dist'));
  await publishStatic(path.join(bundle, 'h5'), path.join(root, 'apps/mobile/dist/build/h5'));
  const covers = path.join(root, 'uploads/demo-activities');
  await fs.mkdir(covers, { recursive: true });
  for (const filename of await fs.readdir(path.join(bundle, 'covers'))) {
    const source = await fs.readFile(path.join(bundle, 'covers', filename));
    try {
      const existing = await fs.readFile(path.join(covers, filename));
      if (!existing.equals(source)) throw new Error(`Existing cover differs: ${filename}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(path.join(covers, filename), source, { flag: 'wx', mode: 0o644 }); }
  }
  run(node, [pm2, 'save']);
  await writeRecord('publish-complete.json', { commit: manifest.commit, time: new Date().toISOString(), processes: publicProcesses(processes()) });
  console.log('PUBLISH_OK; only activity-api and activity-worker restarted; old hashed assets retained.');
} else {
  const baseline = JSON.parse(await fs.readFile(path.join(privateDir, 'baseline.json'), 'utf8'));
  const current = publicProcesses(processes());
  for (const previous of baseline.processes.filter(row => !['activity-api', 'activity-worker'].includes(row.name))) {
    const present = current.find(row => row.id === previous.id);
    if (!present || present.pid !== previous.pid || present.restarts !== previous.restarts) throw new Error(`Unrelated PM2 process changed: ${previous.name}`);
  }
  console.log(JSON.stringify({ commit: run('git', ['rev-parse', 'HEAD']), processes: current, backup: privateDir }));
  console.log(run('ps', ['-eo', 'pid,ppid,lstart,comm']).split('\n').filter(line => /nginx|mysqld|redis-server/.test(line)).join('\n'));
}
