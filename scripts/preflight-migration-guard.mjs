import fs from "node:fs";

const failures = [];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function checkSourceIncludes(source, needle, label) {
  check(source.includes(needle), `${label} must include ${needle}.`);
}

const rootPackage = JSON.parse(read("package.json"));
const apiPackage = JSON.parse(read("apps/api/package.json"));
const preflight = read("scripts/preflight.mjs");
const doctor = read("scripts/doctor.mjs");
const runtimeValidation = read("apps/api/src/shared/config-validation.ts");
const runtimeValidationSpec = read("apps/api/src/shared/config-validation.spec.ts");
const productionExample = read("deploy/.env.production.example");
const compose = read("docker-compose.yml");
const systemSettings = read("apps/admin/src/views/SystemSettings.vue");
const launchChecklist = read("docs/launch-checklist.md");
const progress = read("docs/project-progress.md");

check(rootPackage.scripts?.preflight?.includes("node scripts/preflight.mjs"), "package.json preflight must run scripts/preflight.mjs.");

for (const scriptName of ["migration:show", "migration:run", "migration:revert", "migration:generate"]) {
  check(Boolean(apiPackage.scripts?.[scriptName]), `apps/api/package.json must expose ${scriptName}.`);
}

checkSourceIncludes(preflight, "DB_SYNCHRONIZE", "preflight");
checkSourceIncludes(preflight, "must keep DB_SYNCHRONIZE=false and use migrations in production", "preflight");
checkSourceIncludes(preflight, "migration:show", "preflight");
checkSourceIncludes(preflight, "There are pending migrations", "preflight");
checkSourceIncludes(preflight, "migration:run on the target database after backup", "preflight");
checkSourceIncludes(preflight, "apps/api/dist/data-source.js", "preflight");

checkSourceIncludes(doctor, "dbSynchronizeCheck", "doctor");
checkSourceIncludes(doctor, "DB_SYNCHRONIZE", "doctor");
checkSourceIncludes(doctor, "local development only", "doctor");

checkSourceIncludes(runtimeValidation, "addDatabaseSyncCheck", "runtime config validation");
checkSourceIncludes(runtimeValidation, "DB_SYNCHRONIZE", "runtime config validation");
checkSourceIncludes(runtimeValidation, "TypeORM synchronize 仅适合本地开发", "runtime config validation");
checkSourceIncludes(runtimeValidationSpec, "keeps database synchronize disabled by default in production", "runtime config validation spec");
checkSourceIncludes(runtimeValidationSpec, "marks database synchronize as an error when enabled in production", "runtime config validation spec");

checkSourceIncludes(productionExample, "DB_SYNCHRONIZE=false", "production env example");
checkSourceIncludes(compose, "DB_SYNCHRONIZE", "docker compose");

checkSourceIncludes(systemSettings, "dbSynchronize", "admin deployment settings");
checkSourceIncludes(systemSettings, "envLine(\"DB_SYNCHRONIZE\", boolValue(deployment.dbSynchronize))", "admin deployment settings");
checkSourceIncludes(systemSettings, "DB 同步", "admin deployment settings");
checkSourceIncludes(systemSettings, "生产必须保持 false", "admin deployment settings");

checkSourceIncludes(launchChecklist, "DB_SYNCHRONIZE=false", "launch checklist");
checkSourceIncludes(launchChecklist, "migration:show", "launch checklist");
checkSourceIncludes(launchChecklist, "migration:run", "launch checklist");
checkSourceIncludes(launchChecklist, "生产数据库备份后", "launch checklist");
checkSourceIncludes(progress, "本地 MySQL 预检未连通", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight migration guard covers DB synchronize and migration checks.");
}
