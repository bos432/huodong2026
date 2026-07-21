import fs from "node:fs";

const failures = [];
const read = (file) => fs.readFileSync(file, "utf8");
const check = (condition, message) => { if (!condition) failures.push(message); };
const includes = (source, value, label) => check(source.includes(value), `${label} must include ${value}`);
const excludes = (source, value, label) => check(!source.includes(value), `${label} must not include ${value}`);

const service = read("apps/api/src/modules/aid/aid.service.ts");
const privacy = read("apps/api/src/shared/aid-privacy.ts");
const materialSecurity = read("apps/api/src/shared/aid-material-security.ts");
const privateDocument = read("apps/api/src/shared/private-document.ts");
const migration = read("apps/api/src/migrations/1783720000000-AidApplicationGovernance.ts");
const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
const publicController = read("apps/api/src/modules/public/public.controller.ts");
const adminController = read("apps/api/src/modules/admin/admin.controller.ts");
const adminView = read("apps/admin/src/views/AidApplications.vue");
const mobileView = read("apps/mobile/src/pages/apply/aid.vue");
const compose = read("docker-compose.yml");
const privateBackup = read("scripts/private-data-backup.mjs");

includes(privacy, "encryptStoredSecret", "aid encrypted payload");
includes(privacy, "createHmac", "aid blind phone index");
includes(privateDocument, "encryptSecretBuffer", "aid encrypted material storage");
includes(privateDocument, "secure-aid-document://", "aid private material reference");
includes(service, "originalNameEncrypted", "aid encrypted material filename");
includes(service, "detectAidMaterialMime", "aid material magic-byte validation");
includes(service, "AID_APPLICATION_DAILY_LIMIT", "aid daily submission limit");
includes(service, 'lock: { mode: "pessimistic_write" }', "aid concurrent submission lock");
includes(materialSecurity, 'buffer.subarray(0, 5).toString("ascii") === "%PDF-"', "aid PDF signature validation");
includes(service, "applicantNameMasked", "aid masked list");
includes(service, "phoneLookupHash", "aid phone blind index");
includes(service, "supplement_required", "aid supplement lifecycle");
includes(service, "援助申请跟进人与最终审核人必须不同", "aid reviewer separation");
includes(service, "sensitive_revealed", "aid sensitive reveal audit");
includes(service, "material_downloaded", "aid material download audit");
excludes(service, "sensitivePayloadEncrypted: row.sensitivePayloadEncrypted", "aid response must not expose encrypted payload property directly");
includes(migration, "aid_application_materials", "aid migration");
includes(migration, "aid_application_events", "aid migration");
includes(permissions, "aid.sensitive", "aid sensitive permission");
includes(publicController, 'Post("aid/applications")', "aid public submit endpoint");
includes(publicController, 'Post("me/aid-applications/:id/materials")', "aid public material endpoint");
includes(publicController, 'assertFeatureGateEnabled(context, "charity")', "aid public feature gating");
includes(adminController, 'Post("aid-applications/:id/reveal")', "aid sensitive reveal endpoint");
includes(adminView, "授权查看", "aid admin masked-by-default UI");
includes(mobileView, "consentAccepted", "aid consent UI");
includes(compose, "private-data:/app/private-data", "aid private document persistence");
includes(privateBackup, "PRIVATE_DATA_BACKUP_DIR", "aid private document backup");

if (failures.length) { for (const failure of failures) console.error(`ERR  ${failure}`); process.exitCode = 1; }
else console.log("OK   aid privacy guard covers encrypted payloads, private materials, consent, least privilege, lifecycle and access audit.");
