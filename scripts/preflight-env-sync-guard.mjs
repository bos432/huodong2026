import fs from "node:fs";

const failures = [];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function envKeys(source) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.slice(0, line.indexOf("=")));
}

function duplicateKeys(keys) {
  const seen = new Set();
  const duplicates = new Set();
  for (const key of keys) {
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return [...duplicates];
}

const exampleKeys = envKeys(read("deploy/.env.production.example"));
const productionKeys = fs.existsSync("deploy/.env.production") ? envKeys(read("deploy/.env.production")) : [];
const initScript = read("scripts/init-production-env.mjs");
const preflight = read("scripts/preflight.mjs");
const doctor = read("scripts/doctor.mjs");
const checklist = read("docs/launch-checklist.md");
const progress = read("docs/project-progress.md");

check(productionKeys.length > 0, "deploy/.env.production must exist before release readiness checks.");

for (const key of exampleKeys) {
  check(productionKeys.includes(key), `deploy/.env.production must include ${key} from deploy/.env.production.example.`);
}

for (const key of productionKeys) {
  check(exampleKeys.includes(key), `deploy/.env.production contains ${key}, but deploy/.env.production.example does not document it.`);
}

for (const key of duplicateKeys(exampleKeys)) {
  check(false, `deploy/.env.production.example must not define ${key} more than once.`);
}

for (const key of duplicateKeys(productionKeys)) {
  check(false, `deploy/.env.production must not define ${key} more than once.`);
}

check(initScript.includes("deploy/.env.production.example"), "production env init script must read deploy/.env.production.example.");
check(initScript.includes("existsSync(target)"), "production env init script must handle existing deploy/.env.production.");
check(initScript.includes("added missing"), "production env init script must patch missing keys when deploy/.env.production already exists.");
check(preflight.includes("deploy/.env.production"), "preflight must read deploy/.env.production.");
check(doctor.includes("deploy/.env.production.example"), "doctor must merge deploy/.env.production.example defaults.");
check(checklist.includes("npm run init:production-env"), "launch checklist must include init:production-env.");
check(progress.includes("生产环境模板"), "project progress must mention production env template coverage.");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight env sync guard covers production env keys.");
}


