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
const adminController = read("apps/api/src/modules/admin/admin.controller.ts");
const adminService = read("apps/api/src/modules/admin/admin.service.ts");
const publicService = read("apps/api/src/modules/public/public.service.ts");
const publicCoursesController = read("apps/api/src/modules/courses/public-courses.controller.ts");
const coursesService = read("apps/api/src/modules/courses/courses.service.ts");
const mallPublicController = read("apps/api/src/modules/mall/mall-public.controller.ts");
const mallService = read("apps/api/src/modules/mall/mall.service.ts");
const uploadSecurity = read("apps/api/src/shared/upload-security.ts");
const uploadMalwareScan = read("apps/api/src/shared/upload-malware-scan.ts");
const objectStorage = read("apps/api/src/shared/object-storage.ts");
const objectStorageService = read("apps/api/src/shared/object-storage.service.ts");
const mainTs = read("apps/api/src/main.ts");
const configValidation = read("apps/api/src/shared/config-validation.ts");
const activitiesView = read("apps/admin/src/views/Activities.vue");
const systemSettingsView = read("apps/admin/src/views/SystemSettings.vue");
const agentSettlementsView = read("apps/admin/src/views/AgentSettlements.vue");
const smoke = read("scripts/smoke.mjs");
const preflightSmokeGuard = read("scripts/preflight-smoke-guard.mjs");
const nginxConf = read("deploy/nginx/default.conf");
const compose = read("docker-compose.yml");
const launchChecklist = read("docs/launch-checklist.md");
const localAcceptance = read("docs/local-acceptance-test-plan.md");
const runbook = read("docs/production-runbook.md");
const progress = read("docs/project-progress.md");

checkSourceIncludes(packageJson.scripts?.["test:preflight-guards"] || "", "node scripts/preflight-upload-guard.mjs", "package preflight guards script");

checkSourceIncludesAll(adminController, [
  "IMAGE_EXTENSION_BY_MIME",
  '"image/jpeg": ".jpg"',
  '"image/png": ".png"',
  '"image/webp": ".webp"',
  '"image/gif": ".gif"',
  "SETTLEMENT_PROOF_EXTENSION_BY_MIME",
  '"application/pdf": ".pdf"',
  '@Post("uploads/images")',
  '@Post("uploads/settlement-proofs")',
  '@Post("uploads/private-settlement-proofs")',
  '@Get("private-settlement-proofs/:token/download")',
  "limits: { fileSize: 5 * 1024 * 1024 }",
  "limits: { fileSize: 10 * 1024 * 1024 }",
  "Boolean(IMAGE_EXTENSION_BY_MIME[file.mimetype])",
  "Boolean(SETTLEMENT_PROOF_EXTENSION_BY_MIME[file.mimetype])",
  "this.service.uploadedImage(file, admin)",
  "this.service.uploadedSettlementProof(file, admin)"
], "admin upload controller");

checkSourceIncludesAll(adminService, [
  "uploadedImage(file?",
  "uploadedSettlementProof(file?",
  "uploadedPrivateSettlementProof(file?",
  'storePrivateDocument(validated, "settlement-proofs")',
  'purpose: "settlement_proof"',
  "readPrivateSettlementProof(token",
  "validatedUploadFile(file",
  "images-t${admin?.tenantId",
  "settlement-proofs-t${admin?.tenantId",
  "originalName",
  "mimetype"
], "admin upload service");

checkSourceIncludesAll(agentSettlementsView, [
  '/api/admin/uploads/private-settlement-proofs',
  "/admin/private-settlement-proofs/${privateMatch[1]}/download",
  "await downloadFile("
], "private settlement proof admin view");

checkSourceIncludesAll(uploadSecurity, [
  "detectSupportedUploadMime",
  "validatedUploadFile",
  "detectedMime !== declaredMime",
  'return "image/jpeg"',
  'return "image/png"',
  'return "image/webp"',
  'return "image/gif"',
  'return "application/pdf"',
  "safeUploadOriginalName"
], "shared upload signature security");

checkSourceIncludesAll(uploadMalwareScan, [
  "assertUploadMalwareSafe",
  "UPLOAD_MALWARE_SCAN_MODE",
  "CLAMAV_HOST",
  "CLAMAV_PORT",
  "zINSTREAM",
  "UnsupportedMediaTypeException",
  "ServiceUnavailableException",
  'mode === "required"'
], "upload malware scanning adapter");

for (const [source, label] of [[adminService, "admin uploads"], [publicService, "member uploads"], [coursesService, "course uploads"], [publicCoursesController, "community uploads"], [mallPublicController, "merchant application uploads"], [mallService, "merchant payment credential uploads"]]) {
  checkSourceIncludes(source, "assertUploadMalwareSafe", label);
}

checkSourceIncludesAll(uploadSecurity, [
  "validatedCourseResourceFile",
  'return "video/mp4"',
  'return "video/webm"',
  'return "audio/mpeg"',
  'return "audio/wav"',
  'return "audio/ogg"',
  'return "application/zip"',
  'return "application/msword"',
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
], "course resource signature security");

checkSourceIncludesAll(coursesService, [
  "validatedCourseResourceFile(file, resourceType)",
  'storePrivateDocument(validated, "course-resources")',
  'purpose: "course_resource"',
  "contextId: course.id",
  "private-course-resource://${token}",
  "课程资源内容与格式不匹配"
], "course resource upload service");

checkSourceIncludesAll(publicCoursesController, [
  '@Get("course-resources/:token")',
  "payload.expiresAt < Date.now()",
  'res.setHeader("Accept-Ranges", "bytes")',
  'res.setHeader("Content-Range"',
  "courseResourceAccessUrl",
  "expiresAt: Date.now() + 15 * 60 * 1000",
  "privateDocumentExists(stored.reference)"
], "private course resource delivery");

checkSourceIncludesAll(publicService, [
  "uploadMyAvatar(user",
  "uploadMallReviewImage(user",
  "uploadMallRefundImage(user",
  "uploadRegistrationAttachment(user",
  "validatedUploadFile(file",
  "avatars-t${tenant?.id",
  "mall-reviews-t${tenant?.id",
  "mall-refunds-t${tenant?.id",
  'storePrivateDocument(validated, "registration-attachments")',
  'purpose: "registration_attachment"',
  "verifyPrivateAssetToken(token, this.privateAssetSecret())",
  "readMyRegistrationAttachment"
], "member upload security");

checkSourceIncludesAll(publicCoursesController, [
  "uploadCommunityPostImage",
  "validatedUploadFile(file, COMMUNITY_IMAGE_MIMES)",
  "community-posts-t${tenant?.id"
], "community upload security");

checkSourceIncludesAll(mallPublicController, [
  "uploadMerchantApplicationFile",
  "validatedUploadFile(file, MERCHANT_APPLICATION_FILE_MIMES)",
  "merchant-applications-t${tenant?.id"
], "merchant application upload security");

checkSourceIncludesAll(objectStorageService, [
  "normalizeObjectStorageConfig",
  "normalizePublicAssetBase",
  "objectStorageMissingFields",
  "文件存储尚未配置完整",
  "文件存储服务暂时不可用",
  "API 公开域名配置无效",
  "文件访问域名尚未正确配置"
], "object storage safe failure handling");

checkSourceIncludesAll(objectStorage, [
  "normalizePublicAssetBase",
  'hostname === "example.com"',
  'hostname.endsWith(".example.com")',
  'hostname === "localhost"',
  '["http:", "https:"].includes(url.protocol)'
], "public upload origin validation");

checkSourceIncludesAll(mainTs, [
  "useStaticAssets",
  'config.get<string>("UPLOAD_DIR", "uploads")',
  'prefix: "/uploads"'
], "api static upload serving");

checkSourceIncludesAll(configValidation, [
  "addUploadDirCheck",
  "UPLOAD_DIR",
  "持久化"
], "config validation upload check");

checkSourceIncludesAll(activitiesView, [
  "beforeCoverUpload",
  '["image/jpeg", "image/png", "image/webp", "image/gif"]',
  "5 * 1024 * 1024",
  '/api/admin/uploads/images',
  "handleCoverSuccess",
  "handleGroupQrSuccess",
  "sectionImageSuccessHandler"
], "activities image upload view");

checkSourceIncludesAll(systemSettingsView, [
  "beforeImageUpload",
  '["image/jpeg", "image/png", "image/webp", "image/gif"]',
  "5 * 1024 * 1024",
  '/api/admin/uploads/images',
  "handleDefaultGroupQrSuccess",
  "handleThemeBackgroundSuccess"
], "system settings image upload view");

checkSourceIncludesAll(agentSettlementsView, [
  "beforeProofUpload",
  '["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]',
  "10 * 1024 * 1024",
  '/api/admin/uploads/private-settlement-proofs',
  "handleProofSuccess",
  "paidProofUrl",
  "originalName"
], "agent settlement proof upload view");

checkSourceIncludesAll(smoke, [
  "/admin/uploads/images",
  "Uploaded image should be publicly readable",
  "/admin/uploads/settlement-proofs",
  "Settlement proof upload should return url",
  "OK settlement proof upload"
], "main smoke upload coverage");

checkSourceIncludesAll(preflightSmokeGuard, [
  "/admin/uploads/images",
  "/admin/uploads/settlement-proofs",
  "OK settlement proof upload"
], "smoke guard upload coverage");

checkSourceIncludesAll(nginxConf, [
  "client_max_body_size 20m",
  "location ^~ /uploads/",
  "alias /usr/share/nginx/uploads/",
  "try_files $uri =404;"
], "nginx upload serving");

checkSourceIncludesAll(compose, [
  "UPLOAD_DIR: ${UPLOAD_DIR:-uploads}",
  "uploads-data:/app/uploads",
  "uploads-data:/usr/share/nginx/uploads:ro"
], "docker compose upload volume");

checkSourceIncludesAll(launchChecklist, [
  "UPLOAD_DIR",
  "上传目录挂载为持久化卷",
  "后台上传活动封面图片",
  "上传代理结算打款凭证"
], "launch checklist upload coverage");

checkSourceIncludesAll(localAcceptance, [
  "上传超过 5MB 图片",
  "上传非图片文件",
  "上传超过 10MB 打款凭证",
  "上传非图片/PDF 打款凭证",
  "代理结算打款凭证"
], "local acceptance upload coverage");

checkSourceIncludesAll(runbook, [
  "上传目录",
  "打款凭证",
  "导出"
], "production runbook upload coverage");

checkSourceIncludes(progress, "上传与凭证静态 guard", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight upload guard covers image uploads, settlement proof uploads, static serving, smoke checks, and docs.");
}
