import fs from "node:fs";

const requiredChecks = [
  "operationContent",
  "activityBoundary",
  "exportBoundary",
  "paymentBoundary",
  "settlementBoundary"
];

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

const tenantSmoke = read("scripts/tenant-smoke.mjs");
const preflight = read("scripts/preflight.mjs");
const isolationPlan = read("docs/multi-tenant-isolation-plan.md");
const example = JSON.parse(read("deploy/tenant-smoke-result.example.json"));

checkSourceIncludes(tenantSmoke, "deploy/tenant-smoke-result.json", "tenant smoke script");
checkSourceIncludes(preflight, "deploy/tenant-smoke-result.json", "preflight");
check(example?.passed === false, "tenant-smoke-result.example.json must keep passed=false.");
check(example?.tenantA?.code && example?.tenantB?.code, "tenant-smoke-result.example.json must include tenantA.code and tenantB.code.");
check(example?.tenantA?.code !== example?.tenantB?.code, "tenant-smoke-result.example.json must use different tenant example codes.");
checkSourceIncludes(tenantSmoke, "passed", "tenant smoke script");
checkSourceIncludes(preflight, "must have passed=true", "preflight");
checkSourceIncludes(preflight, "tenantA.code and tenantB.code", "preflight");
checkSourceIncludes(preflight, "two different tenant codes", "preflight");

for (const checkKey of requiredChecks) {
  checkSourceIncludes(tenantSmoke, JSON.stringify(checkKey), "tenant smoke script");
  checkSourceIncludes(preflight, JSON.stringify(checkKey), "preflight");
  checkSourceIncludes(isolationPlan, checkKey, "multi-tenant isolation plan");
  check(example?.checks?.[checkKey]?.status === "pending", `tenant-smoke-result.example.json must include checks.${checkKey}.status=pending.`);
  check(example?.checks?.[checkKey]?.note, `tenant-smoke-result.example.json must document checks.${checkKey}.note.`);
}

checkSourceIncludes(tenantSmoke, "TENANT_SMOKE_SKIP_PAYMENT=true", "tenant smoke script");
checkSourceIncludes(preflight, "Re-run npm run smoke:tenant without TENANT_SMOKE_SKIP_PAYMENT=true", "preflight");
checkSourceIncludes(tenantSmoke, "const activityDetail = await api(`/admin/activities/${activity.id}`, { headers: auth(token) });", "tenant smoke script");
checkSourceIncludes(tenantSmoke, "answers(activityDetail.fields || []", "tenant smoke script");
checkSourceIncludes(tenantSmoke, "const paidActivityDetail = await api(`/admin/activities/${paidActivity.id}`, { headers: auth(a.token) });", "tenant smoke script");
checkSourceIncludes(tenantSmoke, "answers(paidActivityDetail.fields || []", "tenant smoke script");
checkSourceIncludes(tenantSmoke, "registration.registration?.id || registration.id", "tenant smoke script");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight tenant guard covers tenant smoke result checks.");
}
