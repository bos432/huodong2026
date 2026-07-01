import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const webroot = resolve(process.env.WEBROOT || repoRoot);
const h5Dist = resolve(repoRoot, "apps/mobile/dist/build/h5");
const adminDist = resolve(repoRoot, "apps/admin/dist");
const adminWebroot = resolve(process.env.ADMIN_WEBROOT || (webroot === h5Dist ? adminDist : resolve(webroot, "admin")));
const strictReleaseVersion = isTruthy(process.env.STRICT_RELEASE_VERSION) || isTruthy(process.env.REQUIRE_RELEASE_VERSION_MATCH);

function isSamePath(a, b) {
  return relative(resolve(a), resolve(b)) === "";
}

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

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

async function readVersionJson(file, label) {
  if (!existsSync(file)) return { label, file, missing: true };
  try {
    const body = JSON.parse(await readFile(file, "utf8"));
    return {
      label,
      file,
      commit: String(body.commit || ""),
      buildTime: String(body.buildTime || ""),
      missing: false
    };
  } catch (error) {
    return { label, file, missing: true, error: error.message };
  }
}

function reportReleaseVersionIssue(message) {
  if (strictReleaseVersion) throw new Error(message);
  console.warn(`WARN ${message}`);
  console.warn("WARN Continuing because STRICT_RELEASE_VERSION is not enabled. Record this known difference in the acceptance report.");
}

async function assertStaticVersionConsistency() {
  const rows = [
    {
      label: "API",
      file: "BUILD_COMMIT",
      commit: String(process.env.BUILD_COMMIT || ""),
      buildTime: String(process.env.BUILD_TIME || ""),
      missing: !process.env.BUILD_COMMIT
    },
    await readVersionJson(resolve(adminDist, "version.json"), "Admin"),
    await readVersionJson(resolve(h5Dist, "version.json"), "H5")
  ];
  const summary = rows.map((row) => `${row.label}=${row.commit || "-"}${row.buildTime ? `@${row.buildTime}` : ""}`).join(", ");
  const missing = rows.filter((row) => row.missing || !row.commit);
  const commits = rows.map((row) => row.commit).filter(Boolean);
  console.log(`Release version summary: ${summary}`);
  if (missing.length) {
    reportReleaseVersionIssue(`Release version metadata is incomplete: ${missing.map((row) => `${row.label}(${row.file})`).join(", ")}`);
  }
  if (commits.length >= 2 && new Set(commits).size > 1) {
    reportReleaseVersionIssue(`Release commit mismatch: ${summary}`);
  }
}

async function backupPath(source, backupDir) {
  if (!existsSync(source)) return;
  await cp(source, resolve(backupDir, basename(source)), { recursive: true, force: true });
}

async function publishDirectory(source, target) {
  if (isSamePath(source, target)) return;
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true, force: true });
}

assertSafeWebroot(webroot);
await assertDirectory(h5Dist, "H5 build output");
await assertDirectory(adminDist, "Admin build output");
await assertStaticVersionConsistency();

const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupDir = resolve(webroot, ".deploy-backups", timestamp);

const h5IsDirectWebroot = isSamePath(h5Dist, webroot);
const adminIsDirectWebroot = isSamePath(adminDist, adminWebroot);

if (!h5IsDirectWebroot || !adminIsDirectWebroot) {
  await mkdir(backupDir, { recursive: true });
}

if (h5IsDirectWebroot) {
  console.log(`H5 build output is already the Nginx webroot: ${webroot}`);
} else {
  await backupPath(resolve(webroot, "index.html"), backupDir);
  await backupPath(resolve(webroot, "assets"), backupDir);
  await backupPath(resolve(webroot, "version.json"), backupDir);
  await cp(resolve(h5Dist, "index.html"), resolve(webroot, "index.html"), { force: true });
  if (existsSync(resolve(h5Dist, "version.json"))) {
    await cp(resolve(h5Dist, "version.json"), resolve(webroot, "version.json"), { force: true });
  }
  await publishDirectory(resolve(h5Dist, "assets"), resolve(webroot, "assets"));
}

if (adminIsDirectWebroot) {
  console.log(`Admin build output is already the Nginx admin root: ${adminWebroot}`);
} else {
  await mkdir(adminWebroot, { recursive: true });
  await backupPath(adminWebroot, backupDir);
  await cp(resolve(adminDist, "index.html"), resolve(adminWebroot, "index.html"), { force: true });
  if (existsSync(resolve(adminDist, "version.json"))) {
    await cp(resolve(adminDist, "version.json"), resolve(adminWebroot, "version.json"), { force: true });
  }
  await publishDirectory(resolve(adminDist, "assets"), resolve(adminWebroot, "assets"));
}

console.log(`Published H5 and admin static files to: ${webroot}`);
if (existsSync(backupDir)) console.log(`Previous static files were backed up to: ${backupDir}`);
