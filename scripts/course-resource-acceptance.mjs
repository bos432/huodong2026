import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHmac } from "node:crypto";

const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = process.env.COURSE_TENANT_CODE || "qiwai-showcase";
const COURSE_ID = Number(process.env.COURSE_RESOURCE_COURSE_ID || 5);
const USER_PHONE = process.env.COURSE_RESOURCE_USER_PHONE || "13990000005";
const USER_PASSWORD = process.env.COURSE_RESOURCE_USER_PASSWORD || "Qiwai123456";
const ADMIN_USERNAME = process.env.COURSE_RESOURCE_ADMIN_USERNAME || "showcase_ops";
const ADMIN_PASSWORD = process.env.COURSE_RESOURCE_ADMIN_PASSWORD || "Qiwai123456";
const FIXTURE_SIZE_MB = Math.min(Math.max(Number(process.env.COURSE_RESOURCE_SIZE_MB || 2), 1), 128);
const fixturePath = resolve("fixtures/course-resource-acceptance.txt");

function assert(condition, message) { if (!condition) throw new Error(message); }

async function jsonRequest(path, { method = "GET", token, tenant = false, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(tenant ? { "x-tenant-code": TENANT_CODE } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  assert(response.ok, `${method} ${path} failed (${response.status}): ${text}`);
  const payload = text ? JSON.parse(text) : null;
  assert(payload?.code === 0, `${method} ${path} failed: ${text}`);
  return payload.data;
}

const platform = await jsonRequest("/admin/auth/login", { method: "POST", body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
const user = await jsonRequest("/public/auth/password-login", { method: "POST", tenant: true, body: { phone: USER_PHONE, password: USER_PASSWORD } });
assert(platform.token && user.userAccessToken, "login token missing");

const fixtureSeed = await readFile(fixturePath);
const fixtureSize = FIXTURE_SIZE_MB * 1024 * 1024;
const fixture = Buffer.concat([fixtureSeed, Buffer.alloc(fixtureSize - fixtureSeed.length, 0x41)]);
const form = new FormData();
form.append("file", new Blob([fixture], { type: "text/plain" }), "course-resource-acceptance.txt");
const uploadResponse = await fetch(`${API_BASE}/admin/course-resources/upload?type=attachment&courseId=${COURSE_ID}`, { method: "POST", headers: { authorization: `Bearer ${platform.token}` }, body: form });
const uploadText = await uploadResponse.text();
assert(uploadResponse.ok, `resource upload failed (${uploadResponse.status}): ${uploadText}`);
const upload = JSON.parse(uploadText).data;
assert(upload.url?.startsWith("private-course-resource://"), "upload did not return a private reference");

const stamp = Date.now();
const chapter = await jsonRequest("/admin/course-chapters", { method: "POST", token: platform.token, body: { courseId: COURSE_ID, title: `07.01 私有资源验收保留 ${stamp}`, sortOrder: 900 } });
const lesson = await jsonRequest("/admin/course-lessons", {
  method: "POST",
  token: platform.token,
  body: { chapterId: chapter.id, title: `私有附件与 Range 验收 ${stamp}`, contentType: "attachment", attachmentUrl: upload.url, attachmentName: upload.originalName, content: "附件仅向具有课程权限的用户签发短时链接。", isFree: false, status: "published", sortOrder: 1 }
});

const guestCourse = await jsonRequest(`/public/courses/${COURSE_ID}?tenantCode=${TENANT_CODE}`, { tenant: true });
const guestLesson = guestCourse.chapters.flatMap((item) => item.lessons).find((item) => item.id === lesson.id);
assert(guestLesson && guestLesson.locked === true, "guest lesson is not locked");
assert(guestLesson.attachmentUrl === null && guestLesson.content === null, "guest response leaked private resource or content");

const orderResult = await jsonRequest(`/public/courses/${COURSE_ID}/orders?tenantCode=${TENANT_CODE}`, {
  method: "POST",
  token: user.userAccessToken,
  tenant: true,
  body: { paymentMethod: "offline", clientOrderKey: `course-resource:${COURSE_ID}:${stamp}` }
});
assert(orderResult.owned || orderResult.order?.id, "paid-course order or existing ownership was not returned");
if (!orderResult.owned) await jsonRequest(`/admin/course-orders/${orderResult.order.id}/confirm-offline-payment`, { method: "POST", token: platform.token, body: {} });

const player = await jsonRequest(`/public/courses/${COURSE_ID}/player?tenantCode=${TENANT_CODE}`, { token: user.userAccessToken, tenant: true });
const ownedLesson = player.chapters.flatMap((item) => item.lessons).find((item) => item.id === lesson.id);
assert(player.owned === true, "acceptance member does not own the course");
assert(ownedLesson?.attachmentUrl?.startsWith("/api/public/course-resources/"), "owned lesson did not receive a signed resource URL");
const resourceUrl = new URL(ownedLesson.attachmentUrl, API_BASE.replace(/\/api$/, ""));

const full = await fetch(resourceUrl);
assert(full.status === 200, `full resource returned ${full.status}`);
const fullBytes = Buffer.from(await full.arrayBuffer());
assert(fullBytes.equals(fixture), "decrypted resource differs from uploaded fixture");
assert(full.headers.get("accept-ranges") === "bytes", "Accept-Ranges header missing");
assert(full.headers.get("content-disposition")?.includes("attachment"), "attachment disposition missing");

const partial = await fetch(resourceUrl, { headers: { range: "bytes=0-15" } });
const partialBytes = Buffer.from(await partial.arrayBuffer());
assert(partial.status === 206, `range resource returned ${partial.status}`);
assert(partial.headers.get("content-range") === `bytes 0-15/${fixture.length}`, `unexpected Content-Range ${partial.headers.get("content-range")}`);
assert(partialBytes.equals(fixture.subarray(0, 16)), "range bytes differ from fixture");

const invalidRange = await fetch(resourceUrl, { headers: { range: `bytes=${fixture.length + 10}-` } });
assert(invalidRange.status === 416, `invalid range returned ${invalidRange.status}`);
assert(invalidRange.headers.get("content-range") === `bytes */${fixture.length}`, "416 Content-Range missing");

const tampered = new URL(resourceUrl);
tampered.pathname = `${tampered.pathname.slice(0, -1)}${tampered.pathname.endsWith("A") ? "B" : "A"}`;
const tamperedResponse = await fetch(tampered);
assert(tamperedResponse.status === 404, `tampered token returned ${tamperedResponse.status}`);

let expiredStatus = null;
if (process.env.PRIVATE_ASSET_SIGNING_SECRET) {
  const token = resourceUrl.pathname.split("/").at(-1);
  const encoded = token.split(".")[0];
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  payload.expiresAt = Date.now() - 1000;
  const expiredEncoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", process.env.PRIVATE_ASSET_SIGNING_SECRET).update(expiredEncoded).digest("base64url");
  const expiredResponse = await fetch(new URL(`/api/public/course-resources/${expiredEncoded}.${signature}`, API_BASE.replace(/\/api$/, "")));
  expiredStatus = expiredResponse.status;
  assert(expiredStatus === 404, `expired signed token returned ${expiredStatus}`);
}

const accessLogs = await jsonRequest(`/admin/course-resource-access-logs?courseId=${COURSE_ID}`, { token: platform.token });
assert(accessLogs.some((item) => item.userId === user.user.id && item.lessonId === lesson.id), "course resource access log missing");

console.log(JSON.stringify({
  ok: true,
  courseId: COURSE_ID,
  chapterId: chapter.id,
  lessonId: lesson.id,
  orderId: orderResult.order?.id || null,
  originalName: upload.originalName,
  bytes: fixture.length,
  fullStatus: full.status,
  partialStatus: partial.status,
  invalidRangeStatus: invalidRange.status,
  tamperedStatus: tamperedResponse.status,
  expiredStatus,
  accessLogCount: accessLogs.filter((item) => item.lessonId === lesson.id).length
}, null, 2));
