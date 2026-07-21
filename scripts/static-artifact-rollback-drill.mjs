import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const h5Root = path.resolve(root, process.env.STATIC_ROLLBACK_H5_ROOT || "apps/mobile/dist/build/h5");
const adminRoot = path.resolve(root, process.env.STATIC_ROLLBACK_ADMIN_ROOT || "apps/admin/dist");
const h5Index = path.resolve(h5Root, "index.html");
const adminIndex = path.resolve(adminRoot, "index.html");
const baseUrl = String(process.env.STATIC_ROLLBACK_BASE_URL || "http://127.0.0.1:18080").replace(/\/$/, "");
const readyUrl = process.env.STATIC_ROLLBACK_READY_URL || "http://127.0.0.1:3000/api/health/ready";
const nginxContainer = process.env.STATIC_ROLLBACK_NGINX_CONTAINER || "activity-nginx";
const resultFile = path.resolve(root, process.env.STATIC_ROLLBACK_RESULT_FILE || "deploy/static-rollback-drill-result.json");
const marker = `STATIC_ROLLBACK_DRILL_CANDIDATE_${Date.now()}`;
const startedAt = Date.now();
let h5Baseline;
let adminBaseline;
let candidateInstalled = false;
let restored = false;

function assertInsideRepo(target, label) {
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${label} must stay inside the repository: ${target}`);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function nginxConfigTest() {
  execFileSync("docker", ["exec", nginxContainer, "nginx", "-t"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return true;
}

async function fetchResponse(url) {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}rollback_probe=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(5000)
  });
  return { status: response.status, body: await response.text(), headers: Object.fromEntries(response.headers.entries()) };
}

function assetUrls(indexBody, prefix) {
  const urls = [...indexBody.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map((match) => match[1]);
  return [...new Set(urls)].slice(0, 8).map((url) => {
    if (/^https?:\/\//.test(url)) return url;
    if (url.startsWith("/")) return `${baseUrl}${url}`;
    return `${baseUrl}${prefix}${url.replace(/^\.\//, "")}`;
  });
}

async function probeHealthyRelease() {
  const [h5, admin, h5Version, adminVersion, ready] = await Promise.all([
    fetchResponse(`${baseUrl}/h5/`),
    fetchResponse(`${baseUrl}/admin/`),
    fetchResponse(`${baseUrl}/version.json`),
    fetchResponse(`${baseUrl}/admin/version.json`),
    fetchResponse(readyUrl)
  ]);
  const assets = [...assetUrls(h5.body, "/"), ...assetUrls(admin.body, "/admin/")];
  const assetResults = await Promise.all(assets.map(async (url) => {
    const response = await fetchResponse(url);
    return { url, status: response.status, bytes: Buffer.byteLength(response.body) };
  }));
  let h5VersionBody = null;
  let adminVersionBody = null;
  let readyBody = null;
  try { h5VersionBody = JSON.parse(h5Version.body); } catch {}
  try { adminVersionBody = JSON.parse(adminVersion.body); } catch {}
  try { readyBody = JSON.parse(ready.body)?.data || JSON.parse(ready.body); } catch {}
  const healthy = h5.status === 200
    && admin.status === 200
    && !h5.body.includes(marker)
    && !admin.body.includes(marker)
    && h5.body.includes('id="app"')
    && admin.body.includes('id="app"')
    && h5Version.status === 200
    && adminVersion.status === 200
    && Boolean(h5VersionBody?.commit)
    && Boolean(adminVersionBody?.commit)
    && ready.status === 200
    && readyBody?.ready === true
    && assets.length >= 4
    && assetResults.every((item) => item.status === 200 && item.bytes > 0);
  return {
    healthy,
    h5: { status: h5.status, marker: h5.body.includes(marker), bytes: Buffer.byteLength(h5.body) },
    admin: { status: admin.status, marker: admin.body.includes(marker), bytes: Buffer.byteLength(admin.body) },
    versions: { h5: h5VersionBody, admin: adminVersionBody },
    apiReady: readyBody?.ready === true,
    assets: assetResults
  };
}

async function installCandidate() {
  const body = Buffer.from(`<!doctype html><html><head><meta charset="utf-8"><title>Rollback drill</title></head><body><main id="${marker}">${marker}</main></body></html>\n`, "utf8");
  await Promise.all([writeFile(h5Index, body), writeFile(adminIndex, body)]);
  candidateInstalled = true;
}

async function restoreBaseline() {
  if (!h5Baseline || !adminBaseline) return;
  await Promise.all([writeFile(h5Index, h5Baseline), writeFile(adminIndex, adminBaseline)]);
  restored = true;
  candidateInstalled = false;
}

async function main() {
  assertInsideRepo(h5Index, "H5 index");
  assertInsideRepo(adminIndex, "Admin index");
  [h5Baseline, adminBaseline] = await Promise.all([readFile(h5Index), readFile(adminIndex)]);
  const baselineHashes = { h5: hash(h5Baseline), admin: hash(adminBaseline) };
  const nginxBefore = nginxConfigTest();
  const baselineProbe = await probeHealthyRelease();
  if (!baselineProbe.healthy) throw new Error("Static baseline is not healthy; refusing to inject a rollback candidate");

  await installCandidate();
  const candidateProbe = await probeHealthyRelease();
  const failureDetected = !candidateProbe.healthy && candidateProbe.h5.marker && candidateProbe.admin.marker && candidateProbe.apiReady;
  if (!failureDetected) throw new Error("Intentional H5/Admin candidate failure was not detected while API remained ready");

  const rollbackStartedAt = Date.now();
  await restoreBaseline();
  const [restoredH5, restoredAdmin] = await Promise.all([readFile(h5Index), readFile(adminIndex)]);
  const restoredHashes = { h5: hash(restoredH5), admin: hash(restoredAdmin) };
  if (restoredHashes.h5 !== baselineHashes.h5 || restoredHashes.admin !== baselineHashes.admin) throw new Error("Restored static index hash does not match the baseline");
  const recoveredProbe = await probeHealthyRelease();
  if (!recoveredProbe.healthy) throw new Error("Static release did not recover after rollback");
  const nginxAfter = nginxConfigTest();

  const result = {
    passed: true,
    executedAt: new Date().toISOString(),
    baseUrl,
    readyUrl,
    nginxContainer,
    nginxConfigValidBefore: nginxBefore,
    nginxConfigValidAfter: nginxAfter,
    baselineHashes,
    restoredHashes,
    failureDetected,
    candidate: candidateProbe,
    recovered: recoveredProbe,
    rollbackSeconds: Number(((Date.now() - rollbackStartedAt) / 1000).toFixed(2)),
    totalSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
    databaseTouched: false,
    apiRestarted: false
  };
  await mkdir(path.dirname(resultFile), { recursive: true });
  await writeFile(resultFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...result, resultFile }, null, 2));
}

main().catch(async (error) => {
  try {
    if (candidateInstalled) await restoreBaseline();
    if (restored) {
      const recoveredProbe = await probeHealthyRelease();
      console.error(`Emergency static restore healthy=${recoveredProbe.healthy}`);
    }
  } catch (restoreError) {
    console.error(`Emergency static restore failed: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
  }
  console.error(`Static rollback drill failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
