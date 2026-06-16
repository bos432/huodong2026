import fs from "node:fs";

const backupEnvKeys = ["BACKUP_DIR", "BACKUP_RETENTION_DAYS", "BACKUP_USE_DOCKER", "MYSQL_CONTAINER"];
const backupScripts = ["db:backup", "db:restore", "db:prune-backups"];
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

const packageJson = JSON.parse(read("package.json"));
const preflight = read("scripts/preflight.mjs");
const doctor = read("scripts/doctor.mjs");
const backupScript = read("scripts/db-backup.mjs");
const restoreScript = read("scripts/db-restore.mjs");
const pruneScript = read("scripts/db-prune-backups.mjs");
const productionExample = read("deploy/.env.production.example");
const launchChecklist = read("docs/launch-checklist.md");
const progress = read("docs/project-progress.md");

for (const scriptName of backupScripts) {
  check(Boolean(packageJson.scripts?.[scriptName]), `package.json must expose ${scriptName}.`);
}

checkSourceIncludes(preflight, "checkBackupScripts", "preflight");
checkSourceIncludes(preflight, "Database backup script missing", "preflight");
checkSourceIncludes(preflight, "Database restore script missing", "preflight");
checkSourceIncludes(preflight, "Database backup prune script missing", "preflight");
checkSourceIncludes(preflight, "must set BACKUP_DIR", "preflight");
checkSourceIncludes(preflight, "must set BACKUP_RETENTION_DAYS to at least 7", "preflight");

for (const key of backupEnvKeys) {
  checkSourceIncludes(productionExample, key, "production env example");
}

checkSourceIncludes(doctor, "backupDirCheck", "doctor");
checkSourceIncludes(doctor, "BACKUP_RETENTION_DAYS", "doctor");
checkSourceIncludes(doctor, "BACKUP_USE_DOCKER", "doctor");
checkSourceIncludes(doctor, "MYSQL_CONTAINER", "doctor");

checkSourceIncludes(backupScript, "createGzip", "database backup script");
checkSourceIncludes(backupScript, "BACKUP_DIR", "database backup script");
checkSourceIncludes(backupScript, "BACKUP_USE_DOCKER", "database backup script");
checkSourceIncludes(backupScript, "MYSQL_CONTAINER", "database backup script");
checkSourceIncludes(backupScript, "mysqldump", "database backup script");

checkSourceIncludes(restoreScript, "RESTORE_CONFIRM", "database restore script");
checkSourceIncludes(restoreScript, "BACKUP_FILE", "database restore script");
checkSourceIncludes(restoreScript, "createGunzip", "database restore script");
checkSourceIncludes(restoreScript, "Refusing to restore without confirmation", "database restore script");

checkSourceIncludes(pruneScript, "BACKUP_RETENTION_DAYS", "database backup prune script");
checkSourceIncludes(pruneScript, "\\.gz", "database backup prune script");
checkSourceIncludes(pruneScript, "fs.unlinkSync", "database backup prune script");

checkSourceIncludes(launchChecklist, "npm run db:backup", "launch checklist");
checkSourceIncludes(launchChecklist, "npm run db:prune-backups", "launch checklist");
checkSourceIncludes(launchChecklist, "RESTORE_CONFIRM=activity_registration", "launch checklist");
checkSourceIncludes(launchChecklist, "每月至少做一次恢复演练", "launch checklist");
checkSourceIncludes(progress, "上线准备", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight backup guard covers database backup, restore and prune checks.");
}
