import fs from "node:fs";

const smsRequiredFields = ["SMS_ACCESS_KEY_ID", "SMS_ACCESS_KEY_SECRET", "SMS_SIGN_NAME", "SMS_TEMPLATE_ID", "SMS_SDK_APP_ID"];
const providerEnabledKeys = ["SMS_PROVIDER_ENABLED", "EMAIL_PROVIDER_ENABLED", "WECHAT_MESSAGE_PROVIDER_ENABLED"];
const providerNameKeys = ["SMS_PROVIDER", "EMAIL_PROVIDER", "WECHAT_MESSAGE_PROVIDER"];
const emailRequiredFields = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"];
const wechatRequiredFields = ["WECHAT_APP_ID", "WECHAT_APP_SECRET"];
const workerKeys = ["NOTIFICATION_FORCE_FAIL", "NOTIFICATION_SCHEDULE_WORKER_ENABLED", "NOTIFICATION_SCHEDULE_WORKER_INTERVAL_SECONDS"];
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

function checkSourceExcludes(source, needle, label) {
  check(!source.includes(needle), `${label} must not include legacy ${needle}.`);
}

const preflight = read("scripts/preflight.mjs");
const doctor = read("scripts/doctor.mjs");
const runtimeValidation = read("apps/api/src/shared/config-validation.ts");
const notificationProvider = read("apps/api/src/modules/v1/notification-provider.service.ts");
const v1Service = read("apps/api/src/modules/v1/v1.service.ts");
const adminSystemSettings = read("apps/admin/src/views/SystemSettings.vue");
const adminConfigCheck = read("apps/admin/src/views/ConfigCheck.vue");
const productionExample = read("deploy/.env.production.example");
const initProductionEnv = read("scripts/init-production-env.mjs");
const compose = read("docker-compose.yml");
const launchChecklist = read("docs/launch-checklist.md");
const progress = read("docs/project-progress.md");

for (const key of providerEnabledKeys) {
  checkSourceIncludes(preflight, key, "preflight");
  checkSourceIncludes(doctor, key, "doctor");
  checkSourceIncludes(runtimeValidation, key, "runtime config validation");
  checkSourceIncludes(adminSystemSettings, key, "admin system settings");
  checkSourceIncludes(adminConfigCheck, key, "admin config check");
  checkSourceIncludes(productionExample, key, "production env example");
  checkSourceIncludes(compose, key, "docker compose");
  checkSourceIncludes(launchChecklist, key, "launch checklist");
}

for (const key of providerNameKeys) {
  checkSourceIncludes(notificationProvider, key, "notification provider service");
  checkSourceIncludes(adminSystemSettings, key, "admin system settings");
  checkSourceIncludes(productionExample, key, "production env example");
  checkSourceIncludes(compose, key, "docker compose");
  checkSourceIncludes(launchChecklist, key, "launch checklist");
}

for (const field of smsRequiredFields) {
  checkSourceIncludes(preflight, field, "preflight");
  checkSourceIncludes(doctor, field, "doctor");
  checkSourceIncludes(runtimeValidation, field, "runtime config validation");
  checkSourceIncludes(notificationProvider, field, "notification provider service");
  checkSourceIncludes(adminSystemSettings, field, "admin system settings");
  checkSourceIncludes(productionExample, field, "production env example");
  checkSourceIncludes(compose, field, "docker compose");
  checkSourceIncludes(launchChecklist, field, "launch checklist");
}
checkSourceIncludes(initProductionEnv, "SMS provider credentials are preferably maintained in the admin System Settings page", "production env init script");
checkSourceIncludes(initProductionEnv, "configure SMS provider credentials in the admin System Settings page", "production env init script");

for (const field of emailRequiredFields) {
  checkSourceIncludes(preflight, field, "preflight");
  checkSourceIncludes(doctor, field, "doctor");
  checkSourceIncludes(runtimeValidation, field, "runtime config validation");
  checkSourceIncludes(notificationProvider, field, "notification provider service");
  checkSourceIncludes(adminSystemSettings, field, "admin system settings");
  checkSourceIncludes(productionExample, field, "production env example");
  checkSourceIncludes(compose, field, "docker compose");
  checkSourceIncludes(launchChecklist, field, "launch checklist");
}

for (const field of wechatRequiredFields) {
  checkSourceIncludes(preflight, field, "preflight");
  checkSourceIncludes(doctor, field, "doctor");
  checkSourceIncludes(runtimeValidation, field, "runtime config validation");
  checkSourceIncludes(notificationProvider, field, "notification provider service");
  checkSourceIncludes(adminSystemSettings, field, "admin system settings");
  checkSourceIncludes(productionExample, field, "production env example");
  checkSourceIncludes(compose, field, "docker compose");
  checkSourceIncludes(launchChecklist, field, "launch checklist");
}

for (const key of workerKeys) {
  checkSourceIncludes(preflight, key, "preflight");
  checkSourceIncludes(doctor, key, "doctor");
  checkSourceIncludes(runtimeValidation, key, "runtime config validation");
  checkSourceIncludes(productionExample, key, "production env example");
  checkSourceIncludes(compose, key, "docker compose");
  checkSourceIncludes(launchChecklist, key, "launch checklist");
}

checkSourceIncludes(adminSystemSettings, "smsTemplateId", "admin system settings");
checkSourceIncludes(adminSystemSettings, "emailProvider", "admin system settings");
checkSourceIncludes(adminSystemSettings, "wechatMessageProvider", "admin system settings");
checkSourceIncludes(adminSystemSettings, "notificationReadiness", "admin system settings");
checkSourceIncludes(adminSystemSettings, "buildNotificationReadiness", "admin system settings");
checkSourceIncludes(adminSystemSettings, "短信验证码", "admin system settings");
checkSourceIncludes(adminSystemSettings, "邮件通知", "admin system settings");
checkSourceIncludes(adminSystemSettings, "微信订阅消息", "admin system settings");
checkSourceIncludes(adminSystemSettings, "缺配置", "admin system settings");
checkSourceIncludes(adminSystemSettings, "已就绪", "admin system settings");
checkSourceIncludes(adminSystemSettings, "缺少：", "admin system settings");
checkSourceIncludes(adminSystemSettings, "短信模板 ID", "admin system settings");
checkSourceIncludes(adminSystemSettings, "邮件服务商", "admin system settings");
checkSourceIncludes(adminSystemSettings, "微信通知服务商", "admin system settings");
checkSourceIncludes(adminConfigCheck, "模板 ID", "admin config check");
checkSourceIncludes(progress, "短信模板凭证挡板", "project progress");
checkSourceIncludes(progress, "通知配置就绪度", "project progress");

checkSourceIncludes(v1Service, "implements OnModuleInit, OnModuleDestroy", "v1 service notification schedule worker lifecycle");
checkSourceIncludes(v1Service, "this.startScheduleWorker();", "v1 service notification schedule worker lifecycle");
checkSourceIncludes(v1Service, "if (this.scheduleTimer) clearInterval(this.scheduleTimer);", "v1 service notification schedule worker lifecycle");
checkSourceIncludes(v1Service, 'this.config.get("NOTIFICATION_SCHEDULE_WORKER_ENABLED", "false") !== "true"', "v1 service notification schedule worker lifecycle");
checkSourceIncludes(v1Service, 'this.config.get("NOTIFICATION_SCHEDULE_WORKER_INTERVAL_SECONDS", 300)', "v1 service notification schedule worker lifecycle");
checkSourceIncludes(v1Service, "setInterval", "v1 service notification schedule worker lifecycle");
checkSourceIncludes(v1Service, "this.runDueNotificationSchedules().catch", "v1 service notification schedule worker lifecycle");
checkSourceIncludes(v1Service, "Notification schedule worker failed", "v1 service notification schedule worker lifecycle");

for (const legacyKey of ["SMS_ENABLED", "EMAIL_ENABLED", "WECHAT_MESSAGE_ENABLED"]) {
  checkSourceExcludes(adminSystemSettings, legacyKey, "admin system settings");
  checkSourceExcludes(adminConfigCheck, legacyKey, "admin config check");
  checkSourceExcludes(launchChecklist, legacyKey, "launch checklist");
}

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight notification guard covers provider env keys, SMS template evidence, and schedule worker lifecycle.");
}
