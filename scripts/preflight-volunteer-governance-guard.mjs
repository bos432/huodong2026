import fs from "node:fs";

const failures = [];
const read = (file) => fs.readFileSync(file, "utf8");
const includes = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} must include ${value}`); };
const migration = read("apps/api/src/migrations/1783740000000-VolunteerGovernance.ts");
const policy = read("apps/api/src/shared/volunteer-governance.ts");
const publicService = read("apps/api/src/modules/public/public.service.ts");
const adminService = read("apps/api/src/modules/admin/admin.service.ts");
const publicController = read("apps/api/src/modules/public/public.controller.ts");
const adminController = read("apps/api/src/modules/admin/admin.controller.ts");
const mobilePage = read("apps/mobile/src/pages/volunteer/index.vue");
const adminPage = read("apps/admin/src/views/Volunteers.vue");
const env = read("deploy/.env.production.example");

for (const table of ["volunteer_profiles", "volunteer_tasks", "volunteer_task_applications", "volunteer_training_records", "volunteer_attendance_records", "volunteer_service_records", "volunteer_hour_adjustments"]) includes(migration, table, "volunteer governance migration");
for (const value of ["pessimistic_write", "applicationIdentityKey", "waitlist", "volunteerHoursFromAttendance", "refreshVolunteerHours"]) includes(`${publicService}\n${adminService}`, value, "volunteer transaction governance");
includes(policy, "verifyVolunteerAttendanceToken", "signed attendance token");
includes(policy, "canTransitionVolunteerApplication", "application state machine");
includes(publicController, 'me/volunteer/task-applications/:id/cancel', "volunteer cancellation endpoint");
includes(publicController, 'me/volunteer/service-records/:id/confirm', "volunteer confirmation endpoint");
includes(adminController, 'volunteer/task-applications/:id/attendance-token', "attendance token endpoint");
includes(adminController, 'volunteer/service-records/:id/action', "service review endpoint");
includes(mobilePage, "submitAttendance", "mobile attendance workflow");
includes(adminPage, "actionServiceRecord", "admin service review workflow");
includes(env, "VOLUNTEER_LOOKUP_HASH_SECRET", "volunteer privacy configuration");
includes(env, "VOLUNTEER_ATTENDANCE_SECRET", "volunteer attendance configuration");

if (failures.length) { failures.forEach((failure) => console.error(`ERR  ${failure}`)); process.exitCode = 1; }
else console.log("OK   volunteer governance guard covers privacy, qualification, quota locking, waitlist, attendance, dual confirmation and immutable hour adjustment.");
