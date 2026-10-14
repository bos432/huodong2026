import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { commitMatchesArtifact, isCommitIdentifier, releaseIdFor, releaseIdentifiersMatch } from './release-metadata.mjs';

const root = process.cwd();
const sourceStatus = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { encoding: 'utf8' }).trim();
if (sourceStatus) {
  throw new Error('Refusing to label a dirty worktree as a Git release. Prepare a reviewed, committed source snapshot before assembling production artifacts.');
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceVersion = JSON.parse(await fs.readFile(path.join(root, 'apps/admin/dist/version.json'), 'utf8'));
const releaseId = releaseIdFor(commit, sourceVersion.buildTime);
const previousCommit = String(process.env.RELEASE_PREVIOUS_COMMIT || '').trim().toLowerCase();
const previousApiCommit = String(process.env.RELEASE_PREVIOUS_API_COMMIT || previousCommit).trim().toLowerCase();
if (!isCommitIdentifier(previousCommit) || releaseIdentifiersMatch(previousCommit, commit)) {
  throw new Error('RELEASE_PREVIOUS_COMMIT must be a valid previous Git commit and differ from the release commit.');
}
if (!isCommitIdentifier(previousApiCommit) || releaseIdentifiersMatch(previousApiCommit, commit)) throw new Error('RELEASE_PREVIOUS_API_COMMIT must identify the previous running API release.');
const output = path.join(root, '.local-logs', 'production-release', releaseId);
const bundle = path.join(output, 'bundle');
await fs.mkdir(bundle, { recursive: true });
for (const [source, target] of [
  ['apps/api/dist', 'api'], ['apps/admin/dist', 'admin'], ['apps/mobile/dist/build/h5', 'h5'], ['uploads/demo-activities', 'covers']
]) await fs.cp(path.join(root, source), path.join(bundle, target), { recursive: true, force: false, errorOnExist: true });
await fs.mkdir(path.join(bundle, 'scripts'));
for (const script of ['deploy-scoped-release.mjs', 'deploy-runtime.mjs', 'deploy-migrations.mjs', 'deploy-admin-static.mjs', 'deploy-h5-static.mjs', 'release-metadata.mjs', 'deploy-database-identity.mjs', 'deploy-database-runtime.mjs']) {
  await fs.copyFile(path.join(root, `scripts/${script}`), path.join(bundle, 'scripts', script));
}
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
if (!commitMatchesArtifact(adminVersion.commit, commit) || !commitMatchesArtifact(h5Version.commit, commit)) throw new Error('Static artifacts do not match release commit.');
const manifest = { releaseId, commit, previousCommit, previousApiCommit, buildTime: adminVersion.buildTime, files };
await fs.writeFile(path.join(bundle, 'release.json'), JSON.stringify(manifest, null, 2));
const archive = path.join(output, `${releaseId}.tar.gz`);
execFileSync('tar', ['-czf', archive, '-C', output, 'bundle']);
console.log(JSON.stringify({ releaseId, archive, bytes: (await fs.stat(archive)).size, sha256: createHash('sha256').update(await fs.readFile(archive)).digest('hex'), files: Object.keys(files).length }));
