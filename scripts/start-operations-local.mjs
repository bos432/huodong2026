import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'apps/api/package.json'));
try {
  const response = await fetch('http://127.0.0.1:3010/api/health/ready', { signal: AbortSignal.timeout(1500) });
  if (response.ok) { console.log('API port 3010 is already running; no processes started.'); process.exit(0); }
} catch { /* No ready local API. */ }
const local = path.join(root, '.local-logs', 'operations-20260905');
const statePath = path.join(local, 'runtime.json');
fs.mkdirSync(local, { recursive: true });
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {
  dbPassword: crypto.randomBytes(24).toString('hex'), adminPassword: crypto.randomBytes(16).toString('hex'), adminUsername: 'operations_local'
};
fs.writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
const dbdir = path.join(local, 'data');
const executable = 'C:/Program Files/MariaDB 12.3/bin/mariadbd.exe';
if (!fs.existsSync(path.join(dbdir, 'mysql'))) {
  if (fs.existsSync(dbdir) && fs.readdirSync(dbdir).length) throw new Error('Non-empty data directory; refusing initialization');
  const result = spawnSync('C:/Program Files/MariaDB 12.3/bin/mariadb-install-db.exe', [`--datadir=${dbdir}`, '--port=13316', `--password=${state.dbPassword}`, '--silent'], { windowsHide: true, encoding: 'utf8' });
  if (result.status) throw new Error('Isolated MariaDB initialization failed');
}
function launch(bin, args, cwd, env, name) {
  const out = fs.openSync(path.join(local, `${name}.out.log`), 'a');
  const err = fs.openSync(path.join(local, `${name}.err.log`), 'a');
  const child = spawn(bin, args, { cwd, env, detached: true, windowsHide: true, stdio: ['ignore', out, err] });
  child.unref(); fs.closeSync(out); fs.closeSync(err); return child.pid;
}
const mysql = require('mysql2/promise');
const dbConfig = { host: '127.0.0.1', port: 13316, user: 'root', password: state.dbPassword };
let db;
try { db = await mysql.createConnection(dbConfig); } catch {
  state.dbPid = launch(executable, [`--datadir=${dbdir}`, '--port=13316', '--bind-address=127.0.0.1', '--character-set-server=utf8mb4', '--collation-server=utf8mb4_unicode_ci'], root, process.env, 'db');
  for (let i = 0; i < 20; i++) { try { db = await mysql.createConnection(dbConfig); break; } catch { await new Promise(resolve => setTimeout(resolve, 500)); } }
}
if (!db) throw new Error('Isolated database did not start');
await db.query('CREATE DATABASE IF NOT EXISTS activity_operations CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
await db.end();
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '13316', DB_USERNAME: 'root', DB_PASSWORD: state.dbPassword, DB_DATABASE: 'activity_operations', DB_SYNCHRONIZE: 'false', API_PORT: '3010', NODE_ENV: 'development', BUSINESS_JOB_WORKER_ENABLED: 'false' });
const { WORKER_DISABLED_SCHEDULE_FLAGS } = require(path.join(root, 'apps/api/dist/worker-config.js'));
for (const key of WORKER_DISABLED_SCHEDULE_FLAGS) process.env[key] = key.includes('INTERVAL_MINUTES') ? '0' : 'false';
const ds = require(path.join(root, 'apps/api/dist/data-source.js')).default;
await ds.initialize();
if (!(await ds.query('SHOW TABLES')).length) await ds.synchronize();
const tenantRepo = ds.getRepository('Tenant');
let tenant = await tenantRepo.findOneBy({ code: 'qiwai-showcase' });
if (!tenant) tenant = await tenantRepo.save(tenantRepo.create({ code: 'qiwai-showcase', name: '慢π本地策划验收', region: '本地验收', enabled: true, settings: {} }));
const admins = ds.getRepository('AdminUser');
if (!(await admins.findOneBy({ username: state.adminUsername }))) await admins.save(admins.create({ username: state.adminUsername, passwordHash: await require('bcryptjs').hash(state.adminPassword, 10), role: 'super_admin', enabled: true, tenant: null }));
await ds.destroy();
state.apiPid = launch(process.execPath, ['apps/api/dist/main.js'], root, process.env, 'api');
if (!process.argv.includes('--api-only')) state.adminPid = launch(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174'], path.join(root, 'apps/admin'), { ...process.env, VITE_DEV_API_PROXY: 'http://127.0.0.1:3010' }, 'admin');
fs.writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
console.log('Isolated API: http://127.0.0.1:3010/api ; Admin: http://127.0.0.1:5174/admin/login');
console.log('Local-only credentials recorded in .local-logs/operations-20260905/runtime.json (not printed).');
