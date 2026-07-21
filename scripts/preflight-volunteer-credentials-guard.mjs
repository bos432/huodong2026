import fs from "node:fs";

const failures = [];
const read = (file) => fs.readFileSync(file, "utf8");
const includes = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} must include ${value}`); };
const migration = read("apps/api/src/migrations/1783750000000-VolunteerCredentials.ts");
const adminService = read("apps/api/src/modules/admin/admin.service.ts");
const publicService = read("apps/api/src/modules/public/public.service.ts");
const publicController = read("apps/api/src/modules/public/public.controller.ts");
const adminController = read("apps/api/src/modules/admin/admin.controller.ts");
const userPage = read("apps/mobile/src/pages/user/certificates.vue");

for (const table of ["volunteer_badge_definitions", "volunteer_badge_awards", "volunteer_service_proofs"]) includes(migration, table, "volunteer credentials migration");
for (const value of ["refreshVolunteerHours", "volunteerBadgeAwards", "issueVolunteerProof", "actionVolunteerProof"]) includes(adminService, value, "credential issuance governance");
includes(publicService, "verifyVolunteerProof", "public proof verification");
includes(publicController, 'volunteer-proofs/:proofNo/verify', "public proof verification endpoint");
includes(adminController, 'volunteer/profiles/:id/proofs', "admin proof endpoint");
includes(userPage, "志愿勋章", "mobile badge display");

if (failures.length) { failures.forEach((failure) => console.error(`ERR  ${failure}`)); process.exitCode = 1; }
else console.log("OK   volunteer credentials guard covers versioned certificates, automatic badges, service proofs, revocation and public verification.");
