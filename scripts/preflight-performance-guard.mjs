import fs from "node:fs";

const failures = [];
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const source = fs.readFileSync("scripts/performance-acceptance.mjs", "utf8");
const mallSource = fs.readFileSync("scripts/mall-performance-acceptance.mjs", "utf8");
const mallService = fs.readFileSync("apps/api/src/modules/mall/mall.service.ts", "utf8");

function check(condition, message) {
  if (!condition) failures.push(message);
}

check(packageJson.scripts?.["acceptance:performance"] === "node scripts/performance-acceptance.mjs", "performance acceptance npm entrypoint is required");
check(source.includes("LARGE_LIST_SIZE = numberEnv(\"PERF_LARGE_LIST_SIZE\", 10_000)"), "performance acceptance must default to a 10,000-row fixture");
check(source.includes("PERF_SPIKE_USERS"), "performance acceptance must cover concurrent registrations");
check(source.includes("/admin/check-ins/overview"), "performance acceptance must cover the check-in overview");
check(source.includes("/admin/registrations/export"), "performance acceptance must cover the complete registration export");
check(source.includes("p95Ms"), "performance acceptance must report p95 latency");
check(source.includes(".local-logs/performance-acceptance-"), "performance acceptance must persist an evidence file");
check(packageJson.scripts?.["acceptance:mall-performance"] === "node scripts/mall-performance-acceptance.mjs", "mall performance acceptance npm entrypoint is required");
check(mallSource.includes("PERF_MALL_SINGLE_ORDERS"), "mall performance acceptance must cover single-store hot inventory");
check(mallSource.includes("PERF_MALL_CROSS_GROUPS"), "mall performance acceptance must cover cross-store checkout groups");
check(mallSource.includes("/public/mall/checkout-groups"), "mall performance acceptance must exercise checkout group creation");
check(mallSource.includes("lockedStock"), "mall performance acceptance must verify locked inventory deltas");
check(mallSource.includes("idempotentReplay"), "mall performance acceptance must verify idempotent replay");
check(mallSource.includes(".local-logs/mall-performance-acceptance-"), "mall performance acceptance must persist an evidence file");
check(mallService.includes("computeMallPointsQuote(user, tenant, amount - couponDiscountAmount, dto.pointsToUse, manager)"), "mall order transactions must reuse their manager for points lookup");
check(mallService.includes("manager?.getRepository(MemberProfile) || this.memberProfiles"), "mall points lookup must support transaction-bound repositories");
check(mallService.includes('createQueryBuilder("lockedSku")'), "mall inventory writes must lock only the SKU base row");
check(mallService.includes('.andWhere("lockedSku.tenantId = :tenantId"'), "mall inventory locks must retain tenant isolation");
check(mallService.includes('code === "ER_LOCK_DEADLOCK"'), "mall inventory deadlocks must return a retryable business conflict");

if (failures.length) {
  failures.forEach((failure) => console.error(`ERR  ${failure}`));
  process.exitCode = 1;
} else {
  console.log("OK   performance guard covers the large list, registration spike, export, thresholds, and evidence file.");
}
