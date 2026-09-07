import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const releaseId = `20260906-${commit.slice(0, 8)}`;
const output = path.join(root, '.local-logs', 'production-release', releaseId);
const bundle = path.join(output, 'bundle');
await fs.mkdir(bundle, { recursive: true });
for (const [source, target] of [
  ['apps/api/dist', 'api'], ['apps/admin/dist', 'admin'], ['apps/mobile/dist/build/h5', 'h5'], ['uploads/demo-activities', 'covers']
]) await fs.cp(path.join(root, source), path.join(bundle, target), { recursive: true, force: false, errorOnExist: true });
await fs.mkdir(path.join(bundle, 'scripts'));
await fs.copyFile(path.join(root, 'scripts/deploy-scoped-release.mjs'), path.join(bundle, 'scripts/deploy-scoped-release.mjs'));
const files = {};
async function hashTree(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await hashTree(filename);
    else files[path.relative(bundle, filename).replace(/\\/g, '/')] = createHash('sha256').update(await fs.readFile(filename)).digest('hex');
  }
}
await hashTree(bundle);
const adminVersion = JSON.parse(await fs.readFile(path.join(bundle, 'admin/version.json'), 'utf8'));
const h5Version = JSON.parse(await fs.readFile(path.join(bundle, 'h5/version.json'), 'utf8'));
if (adminVersion.commit !== commit || h5Version.commit !== commit) throw new Error('Static artifacts do not match release commit.');
const manifest = { releaseId, commit, previousCommit: '67002a96bf1455af4a77cdc54bcea2587b4b3728', buildTime: adminVersion.buildTime, files };
await fs.writeFile(path.join(bundle, 'release.json'), JSON.stringify(manifest, null, 2));
const archive = path.join(output, `${releaseId}.tar.gz`);
execFileSync('tar', ['-czf', archive, '-C', output, 'bundle']);
console.log(JSON.stringify({ releaseId, archive, bytes: (await fs.stat(archive)).size, sha256: createHash('sha256').update(await fs.readFile(archive)).digest('hex'), files: Object.keys(files).length }));
