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

const rootPackage = JSON.parse(read("package.json"));
const apiPackage = JSON.parse(read("apps/api/package.json"));
const adminPackage = JSON.parse(read("apps/admin/package.json"));
const mobilePackage = JSON.parse(read("apps/mobile/package.json"));
const preflight = read("scripts/preflight.mjs");
const publishWebroot = read("scripts/publish-webroot.mjs");
const apiDockerfile = read("apps/api/Dockerfile");
const compose = read("docker-compose.yml");
const nginxGuard = read("scripts/preflight-nginx-guard.mjs");
const migrationGuard = read("scripts/preflight-migration-guard.mjs");
const launchChecklist = read("docs/launch-checklist.md");
const runbook = read("docs/production-runbook.md");
const progress = read("docs/project-progress.md");
const mobileNodeCheck = read("scripts/check-mobile-node-version.mjs");
const mobileH5Build = read("scripts/build-mobile-h5.mjs");
const adminFeatureGates = read("apps/admin/src/feature-gates.ts");
const deliveryPackageVerifier = read("scripts/verify-delivery-package.mjs");
const deliveryChecksums = read("docs/delivery-artifact-checksums-20260717.md");

check(rootPackage.scripts?.build === "npm run build:shared && npm run build:api && npm run build:admin && npm run build:mobile:h5", "package.json build must run shared, API, admin, and H5 builds in order.");
check(rootPackage.scripts?.["build:shared"] === "npm --prefix packages/shared run build", "package.json must expose build:shared.");
check(rootPackage.scripts?.["build:api"] === "npm --prefix apps/api run build", "package.json must expose build:api.");
check(rootPackage.scripts?.["build:admin"] === "npm --prefix apps/admin run build", "package.json must expose build:admin.");
check(rootPackage.scripts?.["build:mobile:h5"] === "node scripts/build-mobile-h5.mjs", "package.json must expose the Node-compatible build:mobile:h5 adapter.");
check(rootPackage.scripts?.["verify:delivery-package"] === "node scripts/verify-delivery-package.mjs", "package.json must expose verify:delivery-package.");
check(rootPackage.scripts?.["verify:delivery-source"] === "node scripts/verify-delivery-source.mjs", "package.json must expose verify:delivery-source.");
checkSourceIncludes(deliveryPackageVerifier, '"build/api/"', "delivery package verifier");
checkSourceIncludes(deliveryPackageVerifier, '"build/admin/"', "delivery package verifier");
checkSourceIncludes(deliveryPackageVerifier, '"build/h5/"', "delivery package verifier");
checkSourceIncludes(deliveryPackageVerifier, '"build/mp-weixin/"', "delivery package verifier");
checkSourceIncludes(deliveryPackageVerifier, "Duplicate ZIP entries", "delivery package verifier");
checkSourceIncludes(deliveryPackageVerifier, "Admin artifact count mismatch", "delivery package verifier");
checkSourceIncludes(deliveryPackageVerifier, "Manifest file set mismatch", "delivery package verifier");
checkSourceIncludes(deliveryPackageVerifier, "Manifest hash mismatch", "delivery package verifier");
checkSourceIncludes(deliveryPackageVerifier, "Delivery package SHA-256 mismatch", "delivery package verifier");
checkSourceIncludes(deliveryPackageVerifier, "checksumRecordMatched", "delivery package verifier");
checkSourceIncludes(deliveryPackageVerifier, "Sensitive or environment-specific delivery files found", "delivery package verifier");
checkSourceIncludes(deliveryChecksums, "npm run verify:delivery-package", "delivery checksum documentation");

check(apiPackage.scripts?.build === "nest build", "apps/api/package.json build must produce Nest dist artifacts.");
check(apiPackage.scripts?.start === "node dist/main.js", "apps/api/package.json start must run dist/main.js.");
checkSourceIncludes(apiPackage.scripts?.["migration:show"] || "", "dist/data-source.js", "API migration:show must use built data-source.");
checkSourceIncludes(apiPackage.scripts?.["migration:run"] || "", "dist/data-source.js", "API migration:run must use built data-source.");
checkSourceIncludes(apiPackage.scripts?.["migration:show"] || "", "npm run build", "API migration:show must build before checking migrations.");
checkSourceIncludes(apiPackage.scripts?.["migration:run"] || "", "npm run build", "API migration:run must build before running migrations.");

checkSourceIncludes(adminPackage.scripts?.build || "", "vue-tsc --noEmit", "admin build script");
checkSourceIncludes(adminPackage.scripts?.build || "", "--max-old-space-size=8192", "admin build script");
checkSourceIncludes(adminPackage.scripts?.build || "", "vite/bin/vite.js build", "admin build script");
checkSourceIncludes(adminPackage.scripts?.build || "", "--configLoader runner", "admin build script");
checkSourceIncludes(mobilePackage.scripts?.["build:h5"] || "", "uni build -p h5", "mobile build:h5");
checkSourceIncludes(mobilePackage.scripts?.["build:h5"] || "", "write-static-version.mjs", "mobile build:h5");
checkSourceIncludes(mobilePackage.scripts?.["prebuild:h5"] || "", "check-mobile-node-version.mjs", "mobile build:h5 runtime check");
checkSourceIncludes(mobilePackage.scripts?.["prebuild:mp-weixin"] || "", "check-mobile-node-version.mjs", "mobile mini program runtime check");
checkSourceIncludes(mobileNodeCheck, "major !== 22", "mobile build runtime check");
checkSourceIncludes(mobileH5Build, 'path.join(root, ".local-tools", "node22")', "mobile H5 build adapter");
checkSourceIncludes(mobileH5Build, '"build", "-p", "h5"', "mobile H5 build adapter");
checkSourceIncludes(mobileH5Build, "clean-mobile-h5-dist.mjs", "mobile H5 build adapter");
checkSourceIncludes(mobileH5Build, "write-static-version.mjs", "mobile H5 build adapter");
checkSourceIncludes(adminFeatureGates, 'adCenter: "ads"', "admin entitlement feature gate");
checkSourceIncludes(adminFeatureGates, 'agentSettlement: "agentSettlement"', "admin entitlement feature gate");
checkSourceIncludes(adminFeatureGates, "currentTenantEntitlements", "admin entitlement feature gate");
checkSourceIncludes(adminPackage.scripts?.build || "", "write-static-version.mjs", "admin build script");

for (const artifact of [
  "apps/api/dist/main.js",
  "apps/api/dist/data-source.js",
  "apps/admin/dist/index.html",
  "apps/mobile/dist/build/h5/index.html"
]) {
  checkSourceIncludes(preflight, artifact, "preflight");
}

checkSourceIncludes(preflight, "checkBuildArtifacts", "preflight");
checkSourceIncludes(preflight, "checkAdminBuildBase", "preflight");
checkSourceIncludes(preflight, 'base: "./"', "preflight");
checkSourceIncludes(preflight, 'src="/assets/', "preflight");
checkSourceIncludes(preflight, 'href="/assets/', "preflight");
checkSourceIncludes(publishWebroot, "assertStaticVersionConsistency", "publish webroot script");
checkSourceIncludes(publishWebroot, "STRICT_RELEASE_VERSION", "publish webroot script");
checkSourceIncludes(publishWebroot, "REQUIRE_RELEASE_VERSION_MATCH", "publish webroot script");
checkSourceIncludes(publishWebroot, "version.json", "publish webroot script");
checkSourceIncludes(publishWebroot, "Record this known difference", "publish webroot script");

checkSourceIncludes(apiDockerfile, "RUN npm --prefix apps/api run build", "API Dockerfile");
checkSourceIncludes(apiDockerfile, "FROM node:22-alpine AS production-dependencies", "API Dockerfile");
checkSourceIncludes(apiDockerfile, "RUN npm ci --omit=dev --prefix apps/api", "API Dockerfile");
checkSourceIncludes(apiDockerfile, "COPY --from=production-dependencies /app/apps/api/node_modules", "API Dockerfile");
checkSourceIncludes(apiDockerfile, "COPY --from=build /app/apps/api/dist ./apps/api/dist", "API Dockerfile");
checkSourceIncludes(apiDockerfile, 'CMD ["node", "apps/api/dist/main.js"]', "API Dockerfile");
checkSourceIncludes(compose, "dockerfile: apps/api/Dockerfile", "docker compose");
checkSourceIncludes(compose, "./apps/admin/dist:/usr/share/nginx/admin:ro", "docker compose");
checkSourceIncludes(compose, "./apps/mobile/dist/build/h5:/usr/share/nginx/h5:ro", "docker compose");
checkSourceIncludes(nginxGuard, "./apps/admin/dist:/usr/share/nginx/admin:ro", "Nginx guard");
checkSourceIncludes(nginxGuard, "./apps/mobile/dist/build/h5:/usr/share/nginx/h5:ro", "Nginx guard");
checkSourceIncludes(migrationGuard, "apps/api/dist/data-source.js", "migration guard");

checkSourceIncludes(launchChecklist, "npm run build", "launch checklist");
checkSourceIncludes(launchChecklist, "STRICT_RELEASE_VERSION", "launch checklist");
checkSourceIncludes(launchChecklist, "复制版本信息", "launch checklist");
checkSourceIncludes(launchChecklist, "--configLoader runner", "launch checklist");
checkSourceIncludes(launchChecklist, "构建产物", "launch checklist");
checkSourceIncludes(launchChecklist, "docker compose --env-file deploy/.env.production up -d --build", "launch checklist");
checkSourceIncludes(runbook, "npm run build", "production runbook");
checkSourceIncludes(runbook, "--configLoader runner", "production runbook");
checkSourceIncludes(runbook, "docker compose --env-file deploy/.env.production up -d --build", "production runbook");
checkSourceIncludes(runbook, "回滚后台和 H5 静态构建产物", "production runbook");
checkSourceIncludes(progress, "构建产物静态 guard", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight build artifact guard covers build scripts, artifacts, Docker, Nginx, and release docs.");
}
