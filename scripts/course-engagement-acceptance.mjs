import { createRequire } from "node:module";
import path from "node:path";

const mysql = createRequire(path.resolve("apps/api/package.json"))("mysql2/promise");
const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = "qiwai-showcase";
const stamp = Date.now();
const phone = `1368${String(stamp).slice(-7)}`;

function assert(condition, message) { if (!condition) throw new Error(message); }

async function raw(pathname, { method = "GET", token, body, tenantCode = TENANT_CODE } = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { "content-type": "application/json", "x-tenant-code": tenantCode, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload, text };
}

async function request(pathname, options = {}) {
  const result = await raw(pathname, options);
  assert(result.response.ok && result.payload?.code === 0, `${options.method || "GET"} ${pathname} failed (${result.response.status}): ${result.text}`);
  return result.payload.data;
}

const ops = await request("/admin/auth/login", { method: "POST", body: { username: "showcase_ops", password: "Qiwai123456" } });
const member = await request("/public/auth/password-login", { method: "POST", body: { phone, password: "Qiwai123456" } });
const token = member.userAccessToken;
const userId = Number(member.user.id);

await request("/public/courses/3/orders?tenantCode=qiwai-showcase", { method: "POST", token, body: { clientOrderKey: `course-engagement:${stamp}` } });
const course = await request("/public/courses/3?tenantCode=qiwai-showcase", { token });
const lessons = (course.chapters || []).flatMap((chapter) => chapter.lessons || []);
assert(lessons.length > 0 && course.owned === true, "course access or published lessons missing");

const reviewContent = `07.04 评价验收保留 ${stamp}，课程内容清晰完整。`;
const review = await request("/public/courses/3/reviews?tenantCode=qiwai-showcase", { method: "POST", token, body: { rating: 5, content: reviewContent } });
assert(review.status === "pending", "new review was not pending");
await request(`/admin/course-reviews/${review.id}`, { method: "PATCH", token: ops.token, body: { status: "approved", reply: "感谢认真学习，欢迎继续交流。" } });
const publicReviews = await request("/public/courses/3/reviews?tenantCode=qiwai-showcase");
const publishedReview = publicReviews.find((item) => item.id === review.id);
assert(publishedReview?.content === reviewContent && publishedReview.reply, "approved review or organizer reply is not public");
for (const forbidden of ["status", "userId", "tenant", "course"]) assert(!(forbidden in publishedReview), `public review exposed ${forbidden}`);

const qa = await request("/public/courses/3/qa?tenantCode=qiwai-showcase", { method: "POST", token, body: { lessonId: lessons[0].id, title: `07.04 答疑验收 ${stamp}`, content: "请说明完成全部课时后证书何时签发？" } });
await request(`/admin/course-qa/${qa.id}/answer`, { method: "PATCH", token: ops.token, body: { answer: "全部已发布课时达到完成条件后，系统会幂等签发课程证书。" } });
const qaList = await request("/public/courses/3/qa?tenantCode=qiwai-showcase", { token });
assert(qaList.some((item) => item.id === qa.id && item.status === "answered" && item.answer), "answered question is missing from learner view");

const announcement = await request("/admin/course-announcements", { method: "POST", token: ops.token, body: { courseId: 3, title: `07.04 公告验收保留 ${stamp}`, content: "课程运营公告已发布，并保留通知发送记录。", status: "published", publishAt: new Date(Date.now() - 60000).toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), notifyLearners: true } });
const notification = await request(`/admin/course-announcements/${announcement.id}/notify`, { method: "POST", token: ops.token, body: {} });
const notificationReplay = await request(`/admin/course-announcements/${announcement.id}/notify`, { method: "POST", token: ops.token, body: {} });
assert(notification.sentCount + notification.failedCount > 0 && notificationReplay.skipped === true, "announcement notification was not sent idempotently");
const announcements = await request("/public/courses/3/announcements?tenantCode=qiwai-showcase", { token });
assert(announcements.some((item) => item.id === announcement.id), "published active announcement is missing from learner view");

await request("/admin/courses/3/certificate-template", { method: "PUT", token: ops.token, body: { name: "07.04 课程结业证书验收保留", issuerName: "慢π演示中心", completionThreshold: 100, requireAssessmentPass: false, enabled: true } });
await request("/public/courses/3/progress?tenantCode=qiwai-showcase", { method: "POST", token, body: { lessonId: lessons[0].id, progress: 10 } });

const db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 13306), user: process.env.DB_USERNAME || "activity", password: process.env.DB_PASSWORD || "activitypass", database: process.env.DB_DATABASE || "activity_registration", timezone: "+08:00" });
try {
  await db.execute("UPDATE user_learning SET updatedAt = DATE_SUB(NOW(), INTERVAL 2 DAY), lastRemindedAt = NULL WHERE userId = ? AND courseId = 3", [userId]);
} finally {
  await db.end();
}
const reminder = await request("/admin/course-learning-reminders/run", { method: "POST", token: ops.token, body: { idleDays: 1 } });
assert(reminder.checkedCount > 0 && reminder.sentCount + reminder.failedCount > 0, "learning reminder did not process idle learners");

const verificationDb = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 13306), user: process.env.DB_USERNAME || "activity", password: process.env.DB_PASSWORD || "activitypass", database: process.env.DB_DATABASE || "activity_registration", timezone: "+08:00" });
let ownNotificationRows;
try {
  const [rows] = await verificationDb.execute("SELECT channel, status, remark, tenantScopeKey FROM notifications WHERE userId = ? AND (remark = ? OR remark = '课程学习提醒:3') ORDER BY id DESC", [userId, `课程公告:${announcement.id}`]);
  ownNotificationRows = rows;
} finally {
  await verificationDb.end();
}
assert(ownNotificationRows.some((row) => row.remark === `课程公告:${announcement.id}` && row.channel === "site" && row.status === "sent" && row.tenantScopeKey === "tenant:23"), "current member did not receive the course announcement site notification");
assert(ownNotificationRows.some((row) => row.remark === "课程学习提醒:3" && row.channel === "site" && row.status === "sent" && row.tenantScopeKey === "tenant:23"), "current member did not receive the learning reminder site notification");

let issued = null;
for (const lesson of lessons) {
  const progress = await request("/public/courses/3/progress?tenantCode=qiwai-showcase", { method: "POST", token, body: { lessonId: lesson.id, progress: 100 } });
  if (progress.certificate) issued = progress.certificate;
}
assert(issued?.certificateNo, "course completion did not issue a certificate");
const replay = await request("/public/courses/3/progress?tenantCode=qiwai-showcase", { method: "POST", token, body: { lessonId: lessons[0].id, progress: 100 } });
assert(replay.certificate?.id === issued.id, "certificate issuance was not idempotent");
const certificates = await request("/public/me/certificates?tenantCode=qiwai-showcase", { token });
assert(certificates.some((item) => item.id === issued.id && item.status === "active"), "issued certificate is missing from member assets");
const verification = await request(`/public/certificates/${encodeURIComponent(issued.certificateNo)}/verify`);
assert(verification.verify?.valid === true && verification.certificateNo === issued.certificateNo, `public certificate verification failed: ${JSON.stringify(verification)}`);
for (const forbidden of ["courseId", "courseTemplateId", "businessSnapshot", "issueBusinessKey", "userId", "tenantId"]) assert(!(forbidden in verification), `verification response exposed ${forbidden}`);

console.log(JSON.stringify({
  ok: true,
  userId,
  phone,
  courseId: 3,
  lessonCount: lessons.length,
  reviewId: review.id,
  qaId: qa.id,
  announcementId: announcement.id,
  announcementSentCount: notification.sentCount,
  announcementFailedCount: notification.failedCount,
  reminder,
  certificateId: issued.id,
  certificateNo: issued.certificateNo,
  verificationStatus: verification.status
}, null, 2));
