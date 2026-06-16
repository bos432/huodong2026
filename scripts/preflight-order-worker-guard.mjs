import fs from "node:fs";

const workerKeys = ["OFFLINE_PAYMENT_EXPIRE_MINUTES", "ORDER_CLOSE_WORKER_ENABLED", "ORDER_CLOSE_WORKER_INTERVAL_SECONDS"];
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

const preflight = read("scripts/preflight.mjs");
const doctor = read("scripts/doctor.mjs");
const runtimeValidation = read("apps/api/src/shared/config-validation.ts");
const adminService = read("apps/api/src/modules/admin/admin.service.ts");
const productionExample = read("deploy/.env.production.example");
const compose = read("docker-compose.yml");
const launchChecklist = read("docs/launch-checklist.md");
const progress = read("docs/project-progress.md");

for (const key of workerKeys) {
  checkSourceIncludes(preflight, key, "preflight");
  checkSourceIncludes(doctor, key, "doctor");
  checkSourceIncludes(runtimeValidation, key, "runtime config validation");
  checkSourceIncludes(productionExample, key, "production env example");
  checkSourceIncludes(compose, key, "docker compose");
}

checkSourceIncludes(preflight, "should enable ORDER_CLOSE_WORKER_ENABLED=true so unpaid orders release seats automatically", "preflight");
checkSourceIncludes(preflight, 'env.ORDER_CLOSE_WORKER_ENABLED === "true"', "preflight");
checkSourceIncludes(preflight, 'numberInRange(env, "ORDER_CLOSE_WORKER_INTERVAL_SECONDS", 30, 3600, "seconds")', "preflight");
checkSourceIncludes(preflight, 'numberInRange(env, "OFFLINE_PAYMENT_EXPIRE_MINUTES", 5, 43200, "minutes")', "preflight");

checkSourceIncludes(doctor, "pending orders will not auto-close", "doctor");
checkSourceIncludes(doctor, 'numberCheck("ORDER_CLOSE_WORKER_INTERVAL_SECONDS"', "doctor");
checkSourceIncludes(doctor, 'numberCheck("OFFLINE_PAYMENT_EXPIRE_MINUTES"', "doctor");

checkSourceIncludes(runtimeValidation, "addWorkerCheck", "runtime config validation");
checkSourceIncludes(runtimeValidation, "自动关单任务未启用", "runtime config validation");
checkSourceIncludes(runtimeValidation, "自动关单间隔", "runtime config validation");
checkSourceIncludes(runtimeValidation, "线下付款有效期", "runtime config validation");

checkSourceIncludes(adminService, "implements OnModuleInit, OnModuleDestroy", "admin service order worker lifecycle");
checkSourceIncludes(adminService, "this.startOrderCloseWorker();", "admin service order worker lifecycle");
checkSourceIncludes(adminService, "if (this.orderCloseTimer) clearInterval(this.orderCloseTimer);", "admin service order worker lifecycle");
checkSourceIncludes(adminService, 'this.config.get("ORDER_CLOSE_WORKER_ENABLED", "false") !== "true"', "admin service order worker lifecycle");
checkSourceIncludes(adminService, 'this.config.get("ORDER_CLOSE_WORKER_INTERVAL_SECONDS", 300)', "admin service order worker lifecycle");
checkSourceIncludes(adminService, "setInterval", "admin service order worker lifecycle");
checkSourceIncludes(adminService, "this.closeExpiredPendingOrders().catch", "admin service order worker lifecycle");
checkSourceIncludes(adminService, "Order close worker failed", "admin service order worker lifecycle");

checkSourceIncludes(productionExample, "ORDER_CLOSE_WORKER_ENABLED=true", "production env example");
checkSourceIncludes(productionExample, "ORDER_CLOSE_WORKER_INTERVAL_SECONDS=300", "production env example");
checkSourceIncludes(productionExample, "OFFLINE_PAYMENT_EXPIRE_MINUTES=1440", "production env example");

checkSourceIncludes(launchChecklist, "关闭过期订单", "launch checklist");
checkSourceIncludes(launchChecklist, "ORDER_CLOSE_WORKER_ENABLED=true", "launch checklist");
checkSourceIncludes(progress, "上线准备", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight order worker guard covers unpaid order expiry, auto-close checks, and worker lifecycle.");
}
