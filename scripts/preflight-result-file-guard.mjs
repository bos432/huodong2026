import fs from "node:fs";

const resultFiles = [
  "deploy/real-payment-smoke-result.json",
  "deploy/tenant-smoke-result.json"
];

const failures = [];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function exists(file) {
  return fs.existsSync(file);
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function checkSourceIncludes(source, needle, label) {
  check(source.includes(needle), `${label} must include ${needle}.`);
}

function gitignoreHas(gitignore, file) {
  const normalized = file.replaceAll("\\", "/");
  return gitignore
    .split(/\r?\n/)
    .map((line) => line.trim().replaceAll("\\", "/"))
    .includes(normalized);
}

const gitignore = read(".gitignore");
const packageJson = JSON.parse(read("package.json"));
const preflightChain = read("scripts/preflight-chain-guard.mjs");
const preflight = read("scripts/preflight.mjs");
const realPaymentSmoke = read("scripts/real-payment-smoke-result.mjs");
const tenantSmoke = read("scripts/tenant-smoke.mjs");
const realPaymentPlan = read("docs/real-payment-integration-plan.md");
const tenantPlan = read("docs/multi-tenant-isolation-plan.md");
const runbook = read("docs/production-runbook.md");
const launchChecklist = read("docs/launch-checklist.md");
const progress = read("docs/project-progress.md");

for (const file of resultFiles) {
  check(gitignoreHas(gitignore, file), `.gitignore must ignore ${file}.`);
  checkSourceIncludes(preflight, file, "preflight");
  checkSourceIncludes(progress, file, "project progress");
}

check(exists("deploy/real-payment-smoke-result.example.json"), "real payment smoke result example must exist.");
check(exists("deploy/tenant-smoke-result.example.json"), "tenant smoke result example must exist.");
checkSourceIncludes(realPaymentSmoke, "process.env.REAL_PAYMENT_PREFLIGHT_RESULT_FILE", "real payment smoke script");
checkSourceIncludes(realPaymentSmoke, "deploy/real-payment-smoke-result.json", "real payment smoke script");
checkSourceIncludes(tenantSmoke, "process.env.TENANT_SMOKE_RESULT_FILE", "tenant smoke script");
checkSourceIncludes(tenantSmoke, "process.env.MULTI_TENANT_PREFLIGHT_RESULT_FILE", "tenant smoke script");
checkSourceIncludes(tenantSmoke, "deploy/tenant-smoke-result.json", "tenant smoke script");

checkSourceIncludes(packageJson.scripts?.["smoke:real-payment"] || "", "scripts/real-payment-smoke-result.mjs", "package smoke:real-payment script");
checkSourceIncludes(packageJson.scripts?.["smoke:tenant"] || "", "scripts/tenant-smoke.mjs", "package smoke:tenant script");
checkSourceIncludes(packageJson.scripts?.["test:preflight-guards"] || "", "scripts/preflight-result-file-guard.mjs", "package preflight guards script");
checkSourceIncludes(preflightChain, "readdirSync(\"scripts\")", "preflight chain guard");
checkSourceIncludes(preflightChain, "preflight-.+-guard\\.mjs", "preflight chain guard");
checkSourceIncludes(preflightChain, "package.json test:preflight-guards must include each preflight guard exactly once", "preflight chain guard");

checkSourceIncludes(realPaymentPlan, "deploy/real-payment-smoke-result.json", "real payment integration plan");
checkSourceIncludes(realPaymentPlan, "npm run smoke:real-payment", "real payment integration plan");
checkSourceIncludes(runbook, "deploy/real-payment-smoke-result.json", "production runbook");
checkSourceIncludes(launchChecklist, "deploy/real-payment-smoke-result.json", "launch checklist");

checkSourceIncludes(tenantPlan, "deploy/tenant-smoke-result.json", "multi-tenant isolation plan");
checkSourceIncludes(tenantPlan, "npm run smoke:tenant", "multi-tenant isolation plan");
checkSourceIncludes(runbook, "跨机构预发验收", "production runbook");
checkSourceIncludes(launchChecklist, "MULTI_TENANT_ENABLED", "launch checklist");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight result file guard covers smoke result paths and ignore rules.");
}
