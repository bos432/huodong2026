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

function checkSourceIncludesAll(source, needles, label) {
  for (const needle of needles) checkSourceIncludes(source, needle, label);
}

const packageJson = JSON.parse(read("package.json"));
const apiPackage = JSON.parse(read("apps/api/package.json"));
const preflight = read("scripts/preflight.mjs");
const buildGuard = read("scripts/preflight-build-artifact-guard.mjs");
const backupGuard = read("scripts/preflight-backup-guard.mjs");
const migrationGuard = read("scripts/preflight-migration-guard.mjs");
const smokeGuard = read("scripts/preflight-smoke-guard.mjs");
const healthGuard = read("scripts/preflight-health-guard.mjs");
const launchChecklist = read("docs/launch-checklist.md");
const runbook = read("docs/production-runbook.md");
const localAcceptance = read("docs/local-acceptance-test-plan.md");
const progress = read("docs/project-progress.md");

checkSourceIncludes(packageJson.scripts?.["test:preflight-guards"] || "", "node scripts/preflight-rollback-guard.mjs", "package preflight guards script");

check(packageJson.scripts?.preflight === "npm run test:preflight-guards && node scripts/preflight.mjs", "package.json preflight must run static guards before release preflight.");
check(Boolean(packageJson.scripts?.build), "package.json must expose build.");
check(Boolean(packageJson.scripts?.smoke), "package.json must expose smoke.");
check(Boolean(packageJson.scripts?.["smoke:flow"]), "package.json must expose smoke:flow.");
check(Boolean(packageJson.scripts?.["db:backup"]), "package.json must expose db:backup.");
check(Boolean(packageJson.scripts?.["db:restore"]), "package.json must expose db:restore.");
checkSourceIncludes(apiPackage.scripts?.["migration:show"] || "", "npm run build", "API migration:show script");
checkSourceIncludes(apiPackage.scripts?.["migration:run"] || "", "npm run build", "API migration:run script");

checkSourceIncludesAll(preflight, [
  "checkBuildArtifacts",
  "checkBackupScripts",
  "checkMigrations",
  "There are pending migrations. Run npm --prefix apps/api run migration:run on the target database after backup."
], "release preflight rollback prerequisites");

checkSourceIncludesAll(buildGuard, [
  "apps/api/dist/main.js",
  "apps/admin/dist/index.html",
  "apps/mobile/dist/build/h5/index.html",
  "回滚后台和 H5 静态构建产物"
], "build artifact guard rollback coverage");

checkSourceIncludesAll(backupGuard, [
  "db:backup",
  "db:restore",
  "RESTORE_CONFIRM",
  "每月至少做一次恢复演练"
], "backup guard rollback coverage");

checkSourceIncludesAll(migrationGuard, [
  "migration:show",
  "migration:run",
  "生产数据库备份后"
], "migration guard rollback coverage");

checkSourceIncludesAll(smokeGuard, [
  "执行 `npm run smoke`",
  "顺序执行 `npm run smoke` 和 `npm run smoke:flow`",
  "production runbook rollback"
], "smoke guard rollback coverage");

checkSourceIncludesAll(healthGuard, [
  "/api/health/ready",
  "release.version",
  "release.commit"
], "health guard rollback coverage");

checkSourceIncludesAll(launchChecklist, [
  "每次发布前记录当前镜像版本或代码版本",
  "发布后保留上一版前端构建产物和 API 镜像",
  "数据库结构变更前必须备份",
  "回滚时先恢复 API，再恢复前端，最后根据备份策略处理数据"
], "launch checklist rollback section");

checkSourceIncludesAll(runbook, [
  "## 1. 发布记录",
  "回滚版本和回滚方式",
  "## 7. 回滚流程",
  "停止新流量或切维护页",
  "记录当前 `/api/health` 的 release 信息",
  "回滚 API 镜像或代码版本",
  "回滚后台和 H5 静态构建产物",
  "不要盲目反向迁移生产库",
  "检查 `/api/health/ready`",
  "执行 `npm run smoke`",
  "恢复流量，并记录回滚结果"
], "production runbook rollback flow");

checkSourceIncludesAll(localAcceptance, [
  "npm run db:backup",
  "npm --prefix apps/api run migration:run",
  "npm run smoke",
  "npm run smoke:flow"
], "local acceptance release rehearsal");

checkSourceIncludes(progress, "发布回滚静态 guard", "project progress rollback entry");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight rollback guard covers release records, backup-before-migration, artifact rollback, readiness checks, smoke verification, and rollback docs.");
}
