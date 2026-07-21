import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const deliveryDir = path.join(root, "delivery");
const requested = process.argv[2];

function candidateVersion(name) {
  const match = name.match(/activity-registration-candidate-\d{8}-r(\d+)\.zip$/);
  return match ? Number(match[1]) : -1;
}

function latestCandidate() {
  const candidates = fs.readdirSync(deliveryDir)
    .filter((name) => candidateVersion(name) >= 0)
    .sort((a, b) => candidateVersion(b) - candidateVersion(a));
  if (!candidates.length) throw new Error("No candidate delivery package found.");
  return path.join(deliveryDir, candidates[0]);
}

const packagePath = requested ? path.resolve(root, requested) : latestCandidate();
if (!fs.existsSync(packagePath)) throw new Error(`Delivery package not found: ${packagePath}`);

function localCandidateDirectory(zipPath) {
  const name = path.basename(zipPath).replace(/^activity-registration-/, "").replace(/\.zip$/, "");
  const directory = path.join(path.dirname(zipPath), name);
  return fs.existsSync(directory) && fs.statSync(directory).isDirectory() ? directory : null;
}

function filesBelow(directory) {
  const files = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile() && entry.name !== "MANIFEST.txt") files.push(absolute);
    }
  }
  return files;
}

function verifyManifest(directory) {
  if (!directory) return null;
  const manifestPath = path.join(directory, "MANIFEST.txt");
  if (!fs.existsSync(manifestPath)) throw new Error("Candidate directory is missing MANIFEST.txt");
  const records = new Map();
  for (const line of fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).filter(Boolean)) {
    const match = line.match(/^([A-Fa-f0-9]{64})  (.+)$/);
    if (!match) throw new Error(`Invalid manifest line: ${line.slice(0, 120)}`);
    const relative = match[2].replace(/\\/g, "/");
    if (records.has(relative)) throw new Error(`Duplicate manifest entry: ${relative}`);
    records.set(relative, match[1].toUpperCase());
  }
  const actualFiles = filesBelow(directory);
  const actualNames = new Set(actualFiles.map((file) => path.relative(directory, file).replace(/\\/g, "/")));
  const missing = [...actualNames].filter((name) => !records.has(name));
  const extra = [...records.keys()].filter((name) => !actualNames.has(name));
  if (missing.length || extra.length) throw new Error(`Manifest file set mismatch: missing=${missing.length}, extra=${extra.length}`);
  for (const file of actualFiles) {
    const relative = path.relative(directory, file).replace(/\\/g, "/");
    const actual = createHash("sha256").update(fs.readFileSync(file)).digest("hex").toUpperCase();
    if (records.get(relative) !== actual) throw new Error(`Manifest hash mismatch: ${relative}`);
  }
  return records.size;
}

function expectedPackageRecord(zipPath) {
  const checksumFile = path.join(root, "docs", "delivery-artifact-checksums-20260717.md");
  if (!fs.existsSync(checksumFile)) return null;
  const relative = path.relative(root, zipPath).replace(/\\/g, "/");
  const row = fs.readFileSync(checksumFile, "utf8").split(/\r?\n/).find((line) => line.includes(path.basename(zipPath)) && line.trimStart().startsWith("|"));
  if (!row) return null;
  const columns = row.split("|").map((column) => column.trim().replace(/^`|`$/g, ""));
  return columns.length >= 5 && /^\d+$/.test(columns[2]) && /^[A-Fa-f0-9]{64}$/.test(columns[3])
    ? { size: Number(columns[2]), sha256: columns[3].toUpperCase() }
    : null;
}

const entries = execFileSync("tar", ["-tf", packagePath], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024
}).split(/\r?\n/).filter(Boolean).map((entry) => entry.replace(/\\/g, "/"));

const duplicates = entries.filter((entry, index) => entries.indexOf(entry) !== index);
const requiredPrefixes = ["build/api/", "build/admin/", "build/h5/", "build/mp-weixin/", "database/", "deploy/", "docs/", "source/"];
const missingPrefixes = requiredPrefixes.filter((prefix) => !entries.some((entry) => entry.startsWith(prefix)));
const requiredSourceEntries = ["source/package.json", "source/docker-compose.yml", "source/deploy/.env.production.example", "source/docs/launch-checklist.md", "source/.github/workflows/quality.yml"];
const missingSourceEntries = requiredSourceEntries.filter((entry) => !entries.includes(entry));
const forbiddenEntries = entries.filter((entry) => /(^|\/)\.env\.production$|(^|\/)(?:real-payment|mall-multi-merchant)-smoke-result\.json$|\.(?:pem|p12|pfx|key)$/i.test(entry));
const adminFiles = entries.filter((entry) => entry.startsWith("build/admin/") && !entry.endsWith("/"));
const currentAdminFiles = fs.existsSync(path.join(root, "apps/admin/dist"))
  ? fs.readdirSync(path.join(root, "apps/admin/dist"), { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).length
  : null;

if (duplicates.length) throw new Error(`Duplicate ZIP entries found: ${duplicates.slice(0, 10).join(", ")}`);
if (missingPrefixes.length) throw new Error(`Missing delivery directories: ${missingPrefixes.join(", ")}`);
if (missingSourceEntries.length) throw new Error(`Incomplete self-contained source tree: ${missingSourceEntries.join(", ")}`);
if (forbiddenEntries.length) throw new Error(`Sensitive or environment-specific delivery files found: ${forbiddenEntries.join(", ")}`);
if (!entries.includes("MANIFEST.txt")) throw new Error("Delivery package is missing MANIFEST.txt");
if (currentAdminFiles !== null && adminFiles.length !== currentAdminFiles) {
  throw new Error(`Admin artifact count mismatch: package=${adminFiles.length}, current=${currentAdminFiles}`);
}

const bytes = fs.readFileSync(packagePath);
const sha256 = createHash("sha256").update(bytes).digest("hex").toUpperCase();
const manifestFiles = verifyManifest(localCandidateDirectory(packagePath));
const expected = expectedPackageRecord(packagePath);
if (!expected) throw new Error(`Delivery checksum record not found for ${path.relative(root, packagePath)}`);
if (expected.size !== bytes.length) throw new Error(`Delivery package size mismatch: expected=${expected.size}, actual=${bytes.length}`);
if (expected.sha256 !== sha256) throw new Error(`Delivery package SHA-256 mismatch: expected=${expected.sha256}, actual=${sha256}`);
console.log(JSON.stringify({
  status: "ok",
  file: path.relative(root, packagePath).replace(/\\/g, "/"),
  size: bytes.length,
  sha256,
  checksumRecordMatched: true,
  entries: entries.length,
  adminFiles: adminFiles.length,
  manifestFiles,
  sourceEntrypoints: requiredSourceEntries.length,
  forbiddenEntries: 0,
  requiredDirectories: requiredPrefixes.length
}, null, 2));
