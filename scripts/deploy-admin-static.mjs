import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = '/www/wwwroot/rd.chaimen666.com';
const releaseId = process.env.ADMIN_RELEASE_ID;
if (process.cwd() !== root || !/^20260907-[a-f0-9]{8}$/.test(releaseId || '')) throw new Error('Expected scoped production root and admin release ID.');
const privateDir = `/www/backup/activity-releases/${releaseId}`;
const bundle = path.join(privateDir, 'bundle');
const destination = path.join(root, 'apps/admin/dist');
const manifest = JSON.parse(await fs.readFile(path.join(bundle, 'release.json'), 'utf8'));
const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const health = async () => {
  const response = await fetch('http://127.0.0.1:18080/api/health/ready', { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Existing API is not ready; no static publication.');
  const body = await response.json();
  const status = body.data || body;
  if (!status.ready) throw new Error('Existing API is not ready.');
  return status;
};
if (manifest.commit !== run('git', ['rev-parse', 'HEAD']) || manifest.commit.slice(0, 8) !== releaseId.slice(9)) throw new Error('Source and artifact commit mismatch.');
if (run('git', ['status', '--porcelain', '--untracked-files=no'])) throw new Error('Tracked production source has uncommitted changes.');
const version = JSON.parse(await fs.readFile(path.join(bundle, 'admin/version.json'), 'utf8'));
if (version.commit !== manifest.commit) throw new Error('Admin version mismatch.');
for (const [relative, expected] of Object.entries(manifest.files)) {
  const filename = path.resolve(bundle, relative);
  if (!filename.startsWith(`${bundle}/`) || hash(await fs.readFile(filename)) !== expected) throw new Error(`Invalid artifact: ${relative}`);
}
await fs.chmod(privateDir, 0o700);
const baseline = {
  api: await health(),
  h5: hash(await fs.readFile(path.join(root, 'apps/mobile/dist/build/h5/index.html'))),
  h5Version: hash(await fs.readFile(path.join(root, 'apps/mobile/dist/build/h5/version.json'))),
  processes: run('ps', ['-eo', 'pid,ppid,lstart,comm'])
};
await fs.writeFile(path.join(privateDir, 'baseline.json'), JSON.stringify(baseline, null, 2), { mode: 0o600, flag: 'wx' });
run('tar', ['-czf', path.join(privateDir, 'previous-admin.tar.gz'), 'apps/admin/dist']);
run('gzip', ['-t', path.join(privateDir, 'previous-admin.tar.gz')]);
const oldIndex = await fs.readFile(path.join(destination, 'index.html'));
const oldVersion = await fs.readFile(path.join(destination, 'version.json'));
async function atomicWrite(filename, bytes) {
  const temporary = path.join(destination, `.${filename}.${releaseId}`);
  await fs.writeFile(temporary, bytes, { mode: 0o644, flag: 'wx' });
  await fs.rename(temporary, path.join(destination, filename));
}
try {
  for (const entry of await fs.readdir(path.join(bundle, 'admin'))) {
    if (['index.html', 'version.json'].includes(entry)) continue;
    await fs.cp(path.join(bundle, 'admin', entry), path.join(destination, entry), { recursive: true });
  }
  await atomicWrite('version.json', await fs.readFile(path.join(bundle, 'admin/version.json')));
  await atomicWrite('index.html', await fs.readFile(path.join(bundle, 'admin/index.html')));
  const after = await health();
  if (after.release.commit !== baseline.api.release.commit || after.uptimeSeconds < baseline.api.uptimeSeconds) throw new Error('API changed during static publication.');
  if (hash(await fs.readFile(path.join(root, 'apps/mobile/dist/build/h5/index.html'))) !== baseline.h5 || hash(await fs.readFile(path.join(root, 'apps/mobile/dist/build/h5/version.json'))) !== baseline.h5Version) throw new Error('H5 changed during static publication.');
  const current = run('ps', ['-eo', 'pid,ppid,lstart,comm']);
  const core = value => value.split('\n').filter(line => / (node|nginx|mysqld|redis-server|php-fpm|dockerd|containerd)$/.test(line)).map(line => line.trim().replace(/ +/g, ' '));
  const currentCore = new Set(core(current));
  const changed = core(baseline.processes).filter(line => !currentCore.has(line));
  const result = { publishedAt: new Date().toISOString(), adminCommit: manifest.commit, apiCommit: after.release.commit, apiReady: after.ready, h5Unchanged: true, coreProcessesChanged: changed, backup: path.join(privateDir, 'previous-admin.tar.gz') };
  await fs.writeFile(path.join(privateDir, 'result.json'), JSON.stringify(result, null, 2), { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify(result));
} catch (error) {
  await atomicWrite('index.html', oldIndex);
  await atomicWrite('version.json', oldVersion);
  throw error;
}
