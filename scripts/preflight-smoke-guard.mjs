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
const smoke = read("scripts/smoke.mjs");
const smokeFlow = read("scripts/smoke-flow.mjs");
const smokeCommunitySharing = read("scripts/smoke-community-sharing.mjs");
const launchChecklist = read("docs/launch-checklist.md");
const runbook = read("docs/production-runbook.md");
const localAcceptance = read("docs/local-acceptance-test-plan.md");
const progress = read("docs/project-progress.md");

check(packageJson.scripts?.smoke === "node scripts/smoke.mjs", "package.json must expose smoke.");
check(packageJson.scripts?.["smoke:flow"] === "node scripts/smoke-flow.mjs", "package.json must expose smoke:flow.");
check(packageJson.scripts?.["smoke:community-sharing"] === "node scripts/smoke-community-sharing.mjs", "package.json must expose smoke:community-sharing.");

checkSourceIncludesAll(smoke, [
  "Smoke target:",
  'api("/health")',
  'api("/health/ready")',
  "/health/metrics",
  "activity_api_up 1",
  "activity_database_up 1",
  "activity_config_error",
  "activity_process_uptime_seconds",
  "activity_build_info",
  "x-content-type-options",
  "x-frame-options",
  "x-request-id",
  "OK health",
  "OK config check",
  "/admin/system/config-check",
  "/admin/uploads/images",
  "/admin/uploads/settlement-proofs",
  "OK settlement proof upload",
  "/admin/orders/export",
  "/admin/finance/export",
  "/admin/activities/",
  "/recap/export",
  "/admin/notifications/send",
  "/admin/notification-schedules/run-due",
  "Smoke test passed."
], "smoke script");

checkSourceIncludesAll(smokeFlow, [
  "Flow smoke target:",
  'api("/health")',
  "Health check should include release metadata",
  "runFreeFlow",
  "runPaidFlow",
  "runExpiredOrderFlow",
  "runWaitlistAndTagFlow",
  "Duplicate check-in should fail clearly",
  "Full business flow smoke test passed."
], "smoke flow script");

checkSourceIncludesAll(smokeCommunitySharing, [
  "Community sharing smoke target:",
  'api("/health")',
  "/public/me/community/postable-activities",
  "/public/me/community/post-images",
  "/public/community/posts",
  "/admin/community-posts",
  "/share",
  "/admin/homepage/sections?pageKey=home",
  "/public/homepage",
  "Pending post should not be publicly visible",
  "Community sharing smoke test passed."
], "community sharing smoke script");

checkSourceIncludes(launchChecklist, "执行 `npm run smoke`", "launch checklist");
checkSourceIncludes(launchChecklist, "执行 `npm run smoke:flow`", "launch checklist");
checkSourceIncludes(launchChecklist, "执行 `npm run smoke:community-sharing`", "launch checklist");
checkSourceIncludes(runbook, "是否执行过 `npm run preflight`、`npm run smoke`、`npm run smoke:flow`", "production runbook");
checkSourceIncludes(runbook, "顺序执行 `npm run smoke` 和 `npm run smoke:flow`", "production runbook");
checkSourceIncludes(runbook, "不要并发运行", "production runbook");
checkSourceIncludes(runbook, "执行 `npm run smoke`", "production runbook rollback");

checkSourceIncludes(localAcceptance, "npm run smoke", "local acceptance test plan");
checkSourceIncludes(localAcceptance, "npm run smoke:flow", "local acceptance test plan");
checkSourceIncludes(localAcceptance, "npm run smoke:community-sharing", "local acceptance test plan");
checkSourceIncludes(localAcceptance, "Smoke test passed.", "local acceptance test plan");
checkSourceIncludes(localAcceptance, "Full business flow smoke test passed.", "local acceptance test plan");
checkSourceIncludes(localAcceptance, "Community sharing smoke test passed.", "local acceptance test plan");
checkSourceIncludes(progress, "烟测静态 guard", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight smoke guard covers smoke scripts, release docs, and local acceptance docs.");
}
