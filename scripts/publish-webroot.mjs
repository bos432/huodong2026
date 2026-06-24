import { cp, mkdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const webroot = resolve(process.env.WEBROOT || repoRoot);
const h5Dist = resolve(repoRoot, "apps/mobile/dist/build/h5");
const adminDist = resolve(repoRoot, "apps/admin/dist");

function assertSafeWebroot(target) {
  const normalized = resolve(target);
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  if (normalized === resolve(sep) || parts.length < 2) {
    throw new Error(`Refusing unsafe WEBROOT: ${target}`);
  }
  if (!existsSync(resolve(normalized, "package.json")) && !existsSync(resolve(normalized, "index.html"))) {
    throw new Error(`WEBROOT must look like the deployed site directory: ${target}`);
  }
}

async function assertDirectory(path, label) {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) throw new Error();
  } catch {
    throw new Error(`${label} does not exist. Please build first: ${path}`);
  }
}

async function backupPath(source, backupDir) {
  if (!existsSync(source)) return;
  await cp(source, resolve(backupDir, basename(source)), { recursive: true, force: true });
}

async function publishDirectory(source, target) {
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true, force: true });
}

assertSafeWebroot(webroot);
await assertDirectory(h5Dist, "H5 build output");
await assertDirectory(adminDist, "Admin build output");

const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupDir = resolve(webroot, ".deploy-backups", timestamp);
await mkdir(backupDir, { recursive: true });

await backupPath(resolve(webroot, "index.html"), backupDir);
await backupPath(resolve(webroot, "assets"), backupDir);
await backupPath(resolve(webroot, "admin"), backupDir);

await cp(resolve(h5Dist, "index.html"), resolve(webroot, "index.html"), { force: true });
await publishDirectory(resolve(h5Dist, "assets"), resolve(webroot, "assets"));

await mkdir(resolve(webroot, "admin"), { recursive: true });
await cp(resolve(adminDist, "index.html"), resolve(webroot, "admin/index.html"), { force: true });
await publishDirectory(resolve(adminDist, "assets"), resolve(webroot, "admin/assets"));

console.log(`Published H5 and admin static files to: ${webroot}`);
console.log(`Previous static files were backed up to: ${backupDir}`);
