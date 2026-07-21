const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
let token = String(process.env.USER_TOKEN || "").trim();
const tenantCode = String(process.env.TENANT_CODE || "qiwai-showcase").trim();
const courseId = Number(process.env.COURSE_ID || 3);
const lessonId = Number(process.env.LESSON_ID || 2);
const lowProgress = Number(process.env.LOW_PROGRESS || 42);
const highProgress = Number(process.env.HIGH_PROGRESS || 83);

if (!Number.isInteger(courseId) || courseId <= 0) throw new Error("COURSE_ID must be a positive integer");
if (!Number.isInteger(lessonId) || lessonId <= 0) throw new Error("LESSON_ID must be a positive integer");
if (![lowProgress, highProgress].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) throw new Error("Progress values must be between 0 and 100");

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-tenant-code": tenantCode, ...(options.userAgent ? { "user-agent": options.userAgent } : {}) },
    body: options.data === undefined ? undefined : JSON.stringify(options.data)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok || payload?.code !== 0) throw new Error(`${path} failed (${response.status}): ${payload?.message || text}`);
  return { status: response.status, requestId: payload.requestId || null, data: payload.data };
}

if (!token) {
  const response = await fetch(`${baseUrl}/public/auth/password-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tenant-code": tenantCode },
    body: JSON.stringify({ phone: process.env.USER_PHONE || "13990000005", password: process.env.USER_PASSWORD || "Qiwai123456" })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.code !== 0 || !payload?.data?.userAccessToken) throw new Error(`user login failed (${response.status}): ${payload?.message || "unknown error"}`);
  token = payload.data.userAccessToken;
}

function lessonFromPlayer(player) {
  return (player?.chapters || []).flatMap((chapter) => chapter.lessons || []).find((lesson) => Number(lesson.id) === lessonId);
}

const before = await request(`/public/courses/${courseId}/player`);
const beforeProgress = Number(lessonFromPlayer(before.data)?.progress || 0);
const writes = await Promise.all([
  request(`/public/courses/${courseId}/progress`, { method: "POST", userAgent: "course-acceptance-device-a", data: { lessonId, progress: highProgress } }),
  request(`/public/courses/${courseId}/progress`, { method: "POST", userAgent: "course-acceptance-device-b", data: { lessonId, progress: lowProgress } })
]);
const invalidResponse = await fetch(`${baseUrl}/public/courses/${courseId}/progress`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-tenant-code": tenantCode },
  body: JSON.stringify({ lessonId, progress: "invalid-progress" })
});
const invalidPayload = await invalidResponse.json().catch(() => null);
const after = await request(`/public/courses/${courseId}/player`);
const afterProgress = Number(lessonFromPlayer(after.data)?.progress || 0);
const deviceViews = await Promise.all([
  request(`/public/courses/${courseId}/player`, { userAgent: "course-acceptance-device-a" }),
  request(`/public/courses/${courseId}/player`, { userAgent: "course-acceptance-device-b" })
]);
const deviceProgress = deviceViews.map((item) => Number(lessonFromPlayer(item.data)?.progress || 0));
const expectedProgress = Math.max(beforeProgress, lowProgress, highProgress);
const invalidRejected = invalidResponse.status === 400 && invalidPayload?.code !== 0;
const passed = afterProgress === expectedProgress && deviceProgress.every((value) => value === expectedProgress) && Number(after.data?.recentLessonId) === lessonId && invalidRejected;

console.log(JSON.stringify({ testedAt: new Date().toISOString(), courseId, lessonId, beforeProgress, lowProgress, highProgress, expectedProgress, afterProgress, deviceProgress, recentLessonId: after.data?.recentLessonId || null, invalidProgressStatus: invalidResponse.status, invalidRejected, requestIds: writes.map((item) => item.requestId), monotonicProtected: passed, multiDeviceSynchronized: deviceProgress.every((value) => value === expectedProgress) }, null, 2));
if (!passed) process.exitCode = 1;
