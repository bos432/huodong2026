import { createRequire } from "node:module";
import path from "node:path";

const mysql = createRequire(path.resolve("apps/api/package.json"))("mysql2/promise");
const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = "qiwai-showcase";
const stamp = Date.now();
const phone = `1386${String(stamp).slice(-7)}`;

function assert(condition, message) { if (!condition) throw new Error(message); }

async function raw(path, { method = "GET", token, body, tenantCode = TENANT_CODE } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-tenant-code": tenantCode, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload, text };
}

async function request(path, options = {}) {
  const result = await raw(path, options);
  assert(result.response.ok && result.payload?.code === 0, `${options.method || "GET"} ${path} failed (${result.response.status}): ${result.text}`);
  return result.payload.data;
}

const ops = await request("/admin/auth/login", { method: "POST", body: { username: "showcase_ops", password: "Qiwai123456" } });
const platformAdmin = await request("/admin/auth/login", { method: "POST", body: { username: "admin", password: "Admin123456" } });
const user = await request("/public/auth/password-login", { method: "POST", body: { phone, password: "Qiwai123456" } });
await request("/public/courses/3/orders?tenantCode=qiwai-showcase", { method: "POST", token: user.userAccessToken, body: { clientOrderKey: `assessment-course:${stamp}` } });

const assessments = await request("/admin/course-assessments?courseId=3", { token: ops.token });
const quiz = assessments.find((item) => item.id === 1);
const assignment = assessments.find((item) => item.id === 2);
assert(quiz?.status === "published" && assignment?.status === "published", "retained quiz/assignment fixtures missing");
const questions = await request("/admin/course-assessments/1/questions", { token: ops.token });
assert(questions.some((item) => item.type === "single") && questions.some((item) => item.type === "boolean"), "objective question types missing");

const starts = await Promise.all(Array.from({ length: 8 }, () => request("/public/course-assessments/1/start?tenantCode=qiwai-showcase", { method: "POST", token: user.userAccessToken, body: {} })));
const attemptIds = Array.from(new Set(starts.map((item) => item.attempt.id)));
assert(attemptIds.length === 1, `concurrent start created ${attemptIds.length} attempts`);
const attemptId = attemptIds[0];
const answers = questions.map((item) => ({ questionId: item.id, answer: item.correctAnswer || [] }));
const submits = await Promise.all(Array.from({ length: 8 }, () => request(`/public/course-assessment-attempts/${attemptId}/submit?tenantCode=qiwai-showcase`, { method: "POST", token: user.userAccessToken, body: { answers } })));
assert(submits.every((item) => item.attempt.id === attemptId && item.attempt.status === "passed"), "concurrent submit did not return the same passed attempt");
assert(submits.filter((item) => item.idempotent === true).length >= 7, "repeated submit did not recover idempotently");

const result = await request(`/public/course-assessment-attempts/${attemptId}?tenantCode=qiwai-showcase`, { token: user.userAccessToken });
assert(result.questions.every((item) => Array.isArray(item.correctAnswer)), "passed result did not expose reviewed answers");

const retained = await request("/admin/course-assessment-attempts/3", { token: ops.token });
assert(retained.attempt.status === "passed" && Number(retained.attempt.manualScore) === 90, "retained essay attempt grading is incorrect");
const essay = retained.questions.find((item) => item.type === "essay");
assert(essay?.answer?.feedback && Number(essay.answer.score) === 90, "retained essay feedback/score missing");

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration",
  timezone: "+08:00"
});
let platformAssessmentId;
let platformAttemptId;
try {
  const [assessmentRows] = await db.execute("SELECT id FROM course_assessments WHERE courseId = 1 AND tenantId IS NULL AND title = ? LIMIT 1", ["07.03 平台隔离验收保留"]);
  if (assessmentRows.length) platformAssessmentId = Number(assessmentRows[0].id);
  else {
    const [inserted] = await db.execute("INSERT INTO course_assessments (courseId, tenantId, title, description, type, passScore, maxAttempts, status, sortOrder) VALUES (1, NULL, ?, ?, 'quiz', 60, 1, 'published', 999)", ["07.03 平台隔离验收保留", "用于验证租户后台不能读取平台注册考核提交"]);
    platformAssessmentId = Number(inserted.insertId);
  }
  const [attemptRows] = await db.execute("SELECT id FROM course_assessment_attempts WHERE userId = ? AND assessmentId = ? AND attemptNo = 1 LIMIT 1", [user.user.id, platformAssessmentId]);
  if (attemptRows.length) platformAttemptId = Number(attemptRows[0].id);
  else {
    const [inserted] = await db.execute("INSERT INTO course_assessment_attempts (userId, courseId, assessmentId, attemptNo, status, objectiveScore, manualScore, totalScore, submittedAt) VALUES (?, 1, ?, 1, 'passed', 100, 0, 100, NOW())", [user.user.id, platformAssessmentId]);
    platformAttemptId = Number(inserted.insertId);
  }
} finally {
  await db.end();
}

const platformAdminAttempt = await raw(`/admin/course-assessment-attempts/${platformAttemptId}`, { token: platformAdmin.token });
assert(platformAdminAttempt.response.status === 200, `platform admin could not read platform attempt (${platformAdminAttempt.response.status})`);
const platformAttempt = await raw(`/admin/course-assessment-attempts/${platformAttemptId}`, { token: ops.token });
assert(platformAttempt.response.status === 404, `tenant operator read platform attempt with status ${platformAttempt.response.status}`);
const crossTenantStart = await raw("/public/course-assessments/1/start?tenantCode=qiwai-hangzhou", { method: "POST", token: user.userAccessToken, tenantCode: "qiwai-hangzhou", body: {} });
assert(crossTenantStart.response.status === 404, `cross-tenant assessment start returned ${crossTenantStart.response.status}`);

const csvResponse = await fetch(`${API_BASE}/admin/course-assessment-attempts-export?courseId=3`, { headers: { authorization: `Bearer ${ops.token}` } });
const csv = await csvResponse.text();
assert(csvResponse.ok && csvResponse.headers.get("content-type")?.includes("text/csv") && csv.replace(/^\uFEFF/, "").startsWith("\"提交ID\""), `assessment CSV is not a raw CSV response (${csvResponse.status}): ${csv.slice(0, 200)}`);
assert(csv.includes("07.03 人工作业验收保留") && csv.includes(String(attemptId)), "assessment CSV is missing retained/new attempts");
assert(!csv.includes("07.03 平台隔离验收保留") && !csv.includes(`\"${platformAttemptId}\",`), "tenant CSV exposed platform assessment attempt");

console.log(JSON.stringify({
  ok: true,
  phone,
  userId: user.user.id,
  attemptId,
  concurrentStarts: starts.length,
  uniqueAttemptCount: attemptIds.length,
  concurrentSubmits: submits.length,
  idempotentSubmits: submits.filter((item) => item.idempotent === true).length,
  finalStatus: result.attempt.status,
  totalScore: result.attempt.totalScore,
  retainedEssayAttemptId: 3,
  retainedEssayScore: retained.attempt.totalScore,
  platformAssessmentId,
  platformAttemptId,
  platformAdminAttemptStatus: platformAdminAttempt.response.status,
  platformAttemptStatus: platformAttempt.response.status,
  crossTenantStatus: crossTenantStart.response.status,
  csvBytes: Buffer.byteLength(csv)
}, null, 2));
