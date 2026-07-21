import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const version = process.argv[2];

if (!/^\d{8}-r\d+$/.test(version || "")) {
  throw new Error("Usage: node scripts/assemble-delivery-candidate.mjs <YYYYMMDD-rN>");
}

const deliveryDir = path.join(root, "delivery");
const candidateDir = path.join(deliveryDir, `candidate-${version}`);
const zipPath = path.join(deliveryDir, `activity-registration-candidate-${version}.zip`);

const forbiddenNames = new Set([
  "node_modules", "dist", "delivery", "backups", ".git", ".local-tools",
  "coverage", ".cache", ".turbo"
]);
const forbiddenFilePatterns = [
  /^\.env$/i,
  /^\.env\.production$/i,
  /^(?:real-payment|mall-multi-merchant)-smoke-result\.json$/i,
  /\.(?:pem|p12|pfx|key)$/i,
  /(?:^|[.-])(?:debug-)?build\.log$/i,
  /^\.tmp-.*\.log$/i,
  /\.log$/i
];

function ensureExists(source, label = source) {
  if (!fs.existsSync(source)) throw new Error(`Missing required delivery input: ${label}`);
}

function shouldCopy(source) {
  const name = path.basename(source);
  if (forbiddenNames.has(name)) return false;
  if (forbiddenFilePatterns.some((pattern) => pattern.test(name))) return false;
  return true;
}

function copy(sourceRelative, targetRelative = sourceRelative, options = {}) {
  console.log(`COPY ${sourceRelative} -> ${targetRelative}`);
  const source = path.join(root, sourceRelative);
  const target = path.join(candidateDir, targetRelative);
  ensureExists(source, sourceRelative);
  copyEntry(source, target, options.unfiltered === true);
}

function copyEntry(source, target, unfiltered) {
  if (!unfiltered && !shouldCopy(source)) return;
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyEntry(path.join(source, entry), path.join(target, entry), unfiltered);
    }
    return;
  }
  if (!stat.isFile()) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function latestFile(directory, pattern) {
  const absolute = path.join(root, directory);
  ensureExists(absolute, directory);
  const files = fs.readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => path.join(absolute, entry.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!files.length) throw new Error(`No matching delivery backup found in ${directory}`);
  return files[0];
}

process.on("uncaughtException", (error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});

fs.mkdirSync(deliveryDir, { recursive: true });
if (fs.existsSync(candidateDir) || fs.existsSync(zipPath)) {
  throw new Error(`Delivery target already exists; remove it before rebuilding: ${candidateDir}`);
}
fs.mkdirSync(candidateDir, { recursive: true });

copy("apps/api/dist", "build/api", { unfiltered: true });
copy("apps/admin/dist", "build/admin", { unfiltered: true });
copy("apps/mobile/dist/build/h5", "build/h5", { unfiltered: true });
copy("apps/mobile/dist/build/mp-weixin", "build/mp-weixin", { unfiltered: true });

const databaseBackup = latestFile("backups/mysql", /^activity_registration-.*\.sql\.gz$/i);
const privateDataBackup = latestFile("backups/private-data", /^private-data-.*\.tar\.gz$/i);
fs.mkdirSync(path.join(candidateDir, "database"), { recursive: true });
fs.copyFileSync(databaseBackup, path.join(candidateDir, "database", path.basename(databaseBackup)));
fs.copyFileSync(privateDataBackup, path.join(candidateDir, "database", path.basename(privateDataBackup)));
copy("apps/api/src/migrations", "database/migrations");

copy("deploy", "deploy");
copy("docs", "docs");

const sourceRoots = [
  ".github", "apps", "deploy", "docs", "packages", "scripts", "交付包-20260711"
];
const sourceFiles = [
  ".dockerignore", ".gitignore", "AGENTS.md", "DEVELOPMENT_LOG.md", "README.md",
  "demo.md", "docker-compose.yml", "install.php", "package.json", "start-api.bat",
  "tsconfig.base.json", "ui.md"
];
for (const entry of sourceRoots) copy(entry, `source/${entry}`);
for (const entry of sourceFiles) {
  if (fs.existsSync(path.join(root, entry))) copy(entry, `source/${entry}`);
}

copy("DEVELOPMENT_LOG.md", "DEVELOPMENT_LOG.md");
copy("docker-compose.yml", "docker-compose.yml");
copy("package.json", "package.json");

execFileSync(process.execPath, [path.join(root, "scripts/generate-delivery-manifest.mjs"), candidateDir], {
  cwd: root,
  stdio: "inherit"
});
const archiveEntries = fs.readdirSync(candidateDir).sort((a, b) => a.localeCompare(b, "en"));
execFileSync("tar", ["-a", "-c", "-f", zipPath, "-C", candidateDir, ...archiveEntries], {
  cwd: root,
  stdio: "inherit"
});

console.log(JSON.stringify({
  status: "ok",
  candidate: path.relative(root, candidateDir).replace(/\\/g, "/"),
  zip: path.relative(root, zipPath).replace(/\\/g, "/"),
  databaseBackup: path.relative(root, databaseBackup).replace(/\\/g, "/"),
  privateDataBackup: path.relative(root, privateDataBackup).replace(/\\/g, "/")
}, null, 2));
