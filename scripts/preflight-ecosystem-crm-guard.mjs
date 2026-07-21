import fs from "node:fs";

const failures = [];
const read = (file) => fs.readFileSync(file, "utf8");
const includes = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} must include ${value}`); };
const migration = read("apps/api/src/migrations/1783730000000-EcosystemPartnerCrm.ts");
const service = read("apps/api/src/modules/admin/admin.service.ts");
const publicService = read("apps/api/src/modules/public/public.service.ts");
const controller = read("apps/api/src/modules/admin/admin.controller.ts");
const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
const rolesGuard = read("apps/api/src/modules/admin/roles.guard.ts");
const adminView = read("apps/admin/src/views/Ambassador.vue");
const policy = read("apps/api/src/shared/ecosystem-crm-policy.ts");
const productionEnv = read("deploy/.env.production.example");

for (const table of ["ambassador_profiles", "ambassador_tasks", "ambassador_contributions", "partner_contracts"]) includes(migration, table, "ecosystem CRM migration");
includes(migration, "convertedTenantId", "partner conversion migration");
includes(service, "ensureAmbassadorProfileFromApplication", "ambassador activation");
includes(service, "publicAmbassadorApplication", "ambassador application response projection");
includes(service, "maskContactHandle(row.wechat)", "ambassador contact masking");
includes(service, '"ambassador.sensitive_reveal"', "ambassador sensitive reveal audit");
includes(service, 'this.logExport(admin, "ambassador_applications"', "ambassador export audit");
includes(service, "delegatedEcosystemAccess", "delegated platform ecosystem scope");
includes(rolesGuard, "request.user.requiredPermission = permission", "delegated permission request context");
includes(service, "贡献登记人与复核人必须不同", "ambassador contribution separation");
includes(service, "合同创建人与复核人必须不同", "partner contract separation");
includes(service, "转换前必须存在当前有效的合作合同", "partner conversion contract gate");
includes(service, "packageSuspended: true", "partner conversion safe default");
includes(publicService, "businessKey", "ecosystem public idempotency");
includes(policy, "ambassadorLevelForPoints", "ambassador level policy");
includes(productionEnv, "ECOSYSTEM_LOOKUP_HASH_SECRET", "ecosystem privacy configuration");
includes(controller, 'Post("partner/applications/:id/convert")', "partner conversion endpoint");
includes(controller, 'Post("ambassador/applications/:id/reveal")', "ambassador sensitive reveal endpoint");
includes(permissions, "partner.manage", "partner permission");
for (const permission of ["ambassador.view", "ambassador.manage", "ambassador.sensitive", "ambassador.export"]) includes(permissions, permission, "ambassador permission split");
includes(adminView, "伙伴合同与转换", "partner CRM admin UI");
includes(adminView, "贡献复核账本", "ambassador contribution UI");
includes(adminView, "canViewAmbassadorSensitive", "ambassador sensitive UI guard");
includes(adminView, "canExportAmbassador", "ambassador export UI guard");

if (failures.length) { failures.forEach((failure) => console.error(`ERR  ${failure}`)); process.exitCode = 1; }
else console.log("OK   ecosystem CRM guard covers ambassador identity, contribution review, partner contracts and controlled conversion.");
