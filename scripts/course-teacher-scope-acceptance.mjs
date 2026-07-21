import fs from "node:fs";
import path from "node:path";

const apiBase = String(process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const password = String(process.env.COURSE_TEACHER_PASSWORD || "Qiwai123456");
const username = String(process.env.COURSE_TEACHER_USERNAME || "showcase_course_teacher");
const adminUsername = String(process.env.ADMIN_USERNAME || "showcase_admin");
const adminPassword = String(process.env.ADMIN_PASSWORD || "Qiwai123456");

async function outcome(route, token = "", options = {}) {
  const response = await fetch(`${apiBase}${route}`, {
    ...options,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => null);
  return { ok: response.ok && body?.code === 0, status: response.status, message: body?.message || "", data: body?.data };
}

async function request(route, token = "", options = {}) {
  const result = await outcome(route, token, options);
  if (!result.ok) throw new Error(`${options.method || "GET"} ${route} failed (${result.status}): ${result.message || "invalid response"}`);
  return result.data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function containsSensitiveKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsSensitiveKey);
  return Object.entries(value).some(([key, item]) => ["passwordHash", "sessionVersion"].includes(key) || containsSensitiveKey(item));
}

const adminLogin = await request("/admin/auth/login", "", { method: "POST", body: JSON.stringify({ username: adminUsername, password: adminPassword }) });
const adminToken = adminLogin.token;
const adminRows = await request(`/admin/admins?keyword=${encodeURIComponent(username)}&includeSmoke=true&page=1&pageSize=100`, adminToken);
let lecturer = (adminRows.items || []).find((item) => item.username === username);
if (!lecturer) {
  lecturer = await request("/admin/admins", adminToken, { method: "POST", body: JSON.stringify({ username, password, role: "operator", permissions: ["course.teacher_scope"] }) });
} else {
  lecturer = await request(`/admin/admins/${lecturer.id}`, adminToken, { method: "PATCH", body: JSON.stringify({ role: "operator", permissions: ["course.teacher_scope"] }) });
}

const coursesBefore = await request("/admin/courses", adminToken);
const targetCourse = coursesBefore.find((course) => Number(course.id) === 3) || coursesBefore[0];
const otherCourse = coursesBefore.find((course) => Number(course.id) !== Number(targetCourse?.id));
assert(targetCourse && otherCourse, "teacher scope acceptance requires at least two tenant courses");

let teachers = await request("/admin/course-teachers", adminToken);
let teacher = teachers.find((item) => Number(item.adminUser?.id) === Number(lecturer.id));
if (!teacher) {
  const stamp = Date.now();
  const bodies = ["A", "B"].map((suffix) => JSON.stringify({ name: `讲师范围验收-${suffix}-${stamp}`, title: "保留测试讲师", status: "active", adminUserId: lecturer.id }));
  const race = await Promise.all(bodies.map((body) => outcome("/admin/course-teachers", adminToken, { method: "POST", body })));
  assert(race.filter((item) => item.ok).length === 1, `concurrent teacher binding expected one success: ${race.map((item) => item.status).join("/")}`);
  assert(race.filter((item) => !item.ok).every((item) => [400, 409].includes(item.status)), `concurrent teacher binding returned unexpected status: ${race.map((item) => item.status).join("/")}`);
  teacher = race.find((item) => item.ok).data;
}
teacher = await request(`/admin/course-teachers/${teacher.id}`, adminToken, { method: "PATCH", body: JSON.stringify({ name: "慢π保留测试讲师", title: "课程交付讲师", bio: "用于验证讲师本人课程数据范围。", status: "active", adminUserId: lecturer.id }) });
await request(`/admin/courses/${targetCourse.id}`, adminToken, { method: "PATCH", body: JSON.stringify({ teacherId: teacher.id }) });

const lecturerLogin = await request("/admin/auth/login", "", { method: "POST", body: JSON.stringify({ username, password }) });
const lecturerToken = lecturerLogin.token;
assert(lecturerLogin.admin.permissions.includes("course.teacher_scope"), "lecturer login is missing teacher scope permission");
assert(lecturerLogin.admin.permissions.includes("course_order.view"), "teacher scope did not inherit course order viewing");
assert(!lecturerLogin.admin.permissions.includes("order.view"), "lecturer unexpectedly inherited general order viewing");

const [scopedCourses, scopedTeachers, accountOptions, memberLevelOptions, overview, courseOrders, assessments, reviews, qa, announcements, resourceLogs] = await Promise.all([
  request("/admin/courses", lecturerToken),
  request("/admin/course-teachers", lecturerToken),
  request("/admin/course-teacher-account-options", lecturerToken),
  request("/admin/course-member-level-options", lecturerToken),
  request("/admin/courses/overview", lecturerToken),
  request("/admin/course-orders?page=1&pageSize=100", lecturerToken),
  request("/admin/course-assessments", lecturerToken),
  request("/admin/course-reviews", lecturerToken),
  request("/admin/course-qa", lecturerToken),
  request("/admin/course-announcements", lecturerToken),
  request("/admin/course-resource-access-logs", lecturerToken)
]);

assert(scopedCourses.length >= 1 && scopedCourses.every((course) => Number(course.teacher?.id) === Number(teacher.id)), "lecturer course list escaped teacher scope");
assert(scopedTeachers.length === 1 && Number(scopedTeachers[0].id) === Number(teacher.id), "lecturer teacher profile scope is incorrect");
assert(accountOptions.length === 1 && Number(accountOptions[0].id) === Number(lecturer.id), "lecturer account options escaped current account");
assert(memberLevelOptions.every((level) => Number(level.tenantId) === Number(lecturerLogin.admin.tenantId)), "course member level options escaped lecturer tenant scope");
assert(memberLevelOptions.every((level) => Object.keys(level).every((key) => ["id", "name", "sortOrder", "tenantId"].includes(key))), "course member level options exposed non-minimal fields");
assert((courseOrders.items || []).every((order) => Number(order.course?.teacher?.id) === Number(teacher.id)), "lecturer course orders escaped teacher scope");
assert(assessments.every((row) => scopedCourses.some((course) => Number(course.id) === Number(row.course_id || row.courseId || row.course?.id))), "assessment list escaped teacher scope");
assert(reviews.every((row) => scopedCourses.some((course) => Number(course.id) === Number(row.course?.id || row.courseId))), "review list escaped teacher scope");
assert(qa.every((row) => scopedCourses.some((course) => Number(course.id) === Number(row.course?.id || row.courseId))), "Q&A list escaped teacher scope");
assert(announcements.every((row) => scopedCourses.some((course) => Number(course.id) === Number(row.course?.id || row.courseId))), "announcement list escaped teacher scope");
assert(resourceLogs.every((row) => scopedCourses.some((course) => Number(course.id) === Number(row.course?.id || row.courseId))), "resource access logs escaped teacher scope");
assert(!containsSensitiveKey(scopedTeachers) && !containsSensitiveKey(accountOptions), "teacher binding response leaked sensitive admin fields");

const [crossDetail, generalOrders, generalMemberLevels, crossUpdate, confirmOrder] = await Promise.all([
  outcome(`/admin/courses/${otherCourse.id}`, lecturerToken),
  outcome("/admin/orders?page=1&pageSize=1", lecturerToken),
  outcome("/admin/member-levels", lecturerToken),
  outcome(`/admin/courses/${otherCourse.id}`, lecturerToken, { method: "PATCH", body: JSON.stringify({ title: otherCourse.title }) }),
  outcome(`/admin/course-orders/${Number((courseOrders.items || [])[0]?.id || 0)}/confirm-offline-payment`, lecturerToken, { method: "POST", body: "{}" })
]);
assert(crossDetail.status === 404, `cross-teacher course detail should be 404, got ${crossDetail.status}`);
assert(generalOrders.status === 403, `lecturer should not access general orders, got ${generalOrders.status}`);
assert(generalMemberLevels.status === 403, `lecturer should not access general member levels, got ${generalMemberLevels.status}`);
assert(crossUpdate.status === 404, `cross-teacher course update should be 404, got ${crossUpdate.status}`);
if ((courseOrders.items || []).length) assert(confirmOrder.status === 403, `read-only lecturer should not confirm course payment, got ${confirmOrder.status}`);

const result = {
  ok: true,
  account: { id: lecturer.id, username, password },
  teacher: { id: teacher.id, name: teacher.name },
  assignedCourseId: Number(targetCourse.id),
  visibleCourseIds: scopedCourses.map((course) => Number(course.id)),
  visibleOrderCount: Number(courseOrders.total || 0),
  overview: overview.kpis,
  boundaries: { crossDetail: crossDetail.status, crossUpdate: crossUpdate.status, generalOrders: generalOrders.status, generalMemberLevels: generalMemberLevels.status, confirmCoursePayment: (courseOrders.items || []).length ? confirmOrder.status : null },
  memberLevelOptionCount: memberLevelOptions.length,
  safeProjection: true,
  createdAt: new Date().toISOString()
};
const outputDir = path.resolve(`.local-logs/course-teacher-scope-${Date.now()}`);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, outputDir }, null, 2));
