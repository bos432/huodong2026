import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = '/www/wwwroot/rd.chaimen666.com';
const releaseId = process.env.H5_RELEASE_ID;
if (process.cwd() !== root || !/^20260907-[a-f0-9]{8}$/.test(releaseId || '')) throw new Error('Expected scoped production root and H5 release ID.');
const privateDir = `/www/backup/activity-releases/${releaseId}`;
const bundle = path.join(privateDir, 'bundle');
const destination = path.join(root, 'apps/mobile/dist/build/h5');
const manifest = JSON.parse(await fs.readFile(path.join(bundle, 'release.json'), 'utf8'));
const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const response = await fetch('http://127.0.0.1:18080/api/health/ready', { signal: AbortSignal.timeout(10000) });
if (!response.ok) throw new Error('Existing API is not ready; no H5 publication.');
const health = (await response.json()).data;
if (!health?.ready) throw new Error('Existing API is not ready.');
if (manifest.commit !== run('git', ['rev-parse', 'HEAD']) || manifest.commit.slice(0, 8) !== releaseId.slice(9)) throw new Error('Source and artifact commit mismatch.');
const version = JSON.parse(await fs.readFile(path.join(bundle, 'h5/version.json'), 'utf8'));
if (version.commit !== manifest.commit) throw new Error('H5 version mismatch.');
for (const [relative, expected] of Object.entries(manifest.files)) {
  const filename = path.resolve(bundle, relative);
  if (!filename.startsWith(`${bundle}/`) || hash(await fs.readFile(filename)) !== expected) throw new Error(`Invalid artifact: ${relative}`);
}
const previous = path.join(privateDir, 'previous-h5.tar.gz');
run('tar', ['-czf', previous, 'apps/mobile/dist/build/h5']);
run('gzip', ['-t', previous]);
const oldIndex = await fs.readFile(path.join(destination, 'index.html'));
const oldVersion = await fs.readFile(path.join(destination, 'version.json'));
async function atomicWrite(filename, bytes) {
  const temporary = path.join(destination, `.${filename}.${releaseId}`);
  await fs.writeFile(temporary, bytes, { mode: 0o644, flag: 'wx' });
  await fs.rename(temporary, path.join(destination, filename));
}
try {
  for (const entry of await fs.readdir(path.join(bundle, 'h5'))) {
    if (['index.html', 'version.json'].includes(entry)) continue;
    await fs.cp(path.join(bundle, 'h5', entry), path.join(destination, entry), { recursive: true });
  }
  await atomicWrite('version.json', await fs.readFile(path.join(bundle, 'h5/version.json')));
  await atomicWrite('index.html', await fs.readFile(path.join(bundle, 'h5/index.html')));
  const afterResponse = await fetch('http://127.0.0.1:18080/api/health/ready', { signal: AbortSignal.timeout(10000) });
  if (!afterResponse.ok) throw new Error('API changed readiness during H5 publication.');
  const after = (await afterResponse.json()).data;
  if (after.release.commit !== health.release.commit) throw new Error('API release changed during H5 publication.');
  await fs.writeFile(path.join(privateDir, 'result.json'), JSON.stringify({ publishedAt: new Date().toISOString(), h5Commit: manifest.commit, apiCommit: after.release.commit, apiReady: after.ready, backup: previous }, null, 2), { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ h5Commit: manifest.commit, apiCommit: after.release.commit, apiReady: after.ready, backup: previous }));
} catch (error) {
  await atomicWrite('index.html', oldIndex);
  await atomicWrite('version.json', oldVersion);
  throw error;
}
