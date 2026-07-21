import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");
const ExcelJS = require("exceljs");
const apiBase = String(process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const password = String(process.env.COURSE_INSIGHTS_PASSWORD || "Qiwai123456");

async function outcome(route, token = "", options = {}) {
  const response = await fetch(`${apiBase}${route}`, { ...options, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  const body = await response.json().catch(() => null);
  return { ok: response.ok && body?.code === 0, status: response.status, message: body?.message || "", data: body?.data };
}

async function request(route, token = "", options = {}) {
  const result = await outcome(route, token, options);
  if (!result.ok) throw new Error(`${options.method || "GET"} ${route} failed (${result.status}): ${result.message || "invalid response"}`);
  return result.data;
}

async function binaryOutcome(route, token = "") {
  const response = await fetch(`${apiBase}${route}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  const buffer = Buffer.from(await response.arrayBuffer());
  return { ok: response.ok, status: response.status, contentType: response.headers.get("content-type") || "", contentDisposition: response.headers.get("content-disposition") || "", buffer };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNumber(actual, expected, label) {
  assert(Number(actual) === Number(expected), `${label}: expected ${expected}, got ${actual}`);
}

const db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 13306), user: process.env.DB_USERNAME || "activity", password: process.env.DB_PASSWORD || "activitypass", database: process.env.DB_DATABASE || "activity_registration", timezone: "+08:00" });

try {
  const adminLogin = await request("/admin/auth/login", "", { method: "POST", body: JSON.stringify({ username: process.env.ADMIN_USERNAME || "showcase_admin", password: process.env.ADMIN_PASSWORD || "Qiwai123456" }) });
  const adminToken = adminLogin.token;
  const lecturerLogin = await request("/admin/auth/login", "", { method: "POST", body: JSON.stringify({ username: process.env.COURSE_TEACHER_USERNAME || "showcase_course_teacher", password: process.env.COURSE_TEACHER_PASSWORD || "Qiwai123456" }) });
  const lecturerToken = lecturerLogin.token;
  const tenantId = Number(lecturerLogin.admin.tenantId || 0);
  assert(tenantId > 0, "lecturer tenant is missing");
  assert(lecturerLogin.admin.permissions.includes("course.export"), "teacher scope did not inherit course export");
  const exportUsername = "showcase_course_export";
  const exportAdminRows = await request(`/admin/admins?keyword=${encodeURIComponent(exportUsername)}&includeSmoke=true&page=1&pageSize=100`, adminToken);
  let exportAdmin = (exportAdminRows.items || []).find((row) => row.username === exportUsername);
  const exportAdminPayload = { username: exportUsername, role: "operator", tenantId, permissions: ["course.export"] };
  exportAdmin = exportAdmin
    ? await request(`/admin/admins/${exportAdmin.id}`, adminToken, { method: "PATCH", body: JSON.stringify(exportAdminPayload) })
    : await request("/admin/admins", adminToken, { method: "POST", body: JSON.stringify({ ...exportAdminPayload, password }) });
  const exportLogin = await request("/admin/auth/login", "", { method: "POST", body: JSON.stringify({ username: exportUsername, password }) });
  const courseAdminToken = exportLogin.token;
  assert(exportLogin.admin.permissions.includes("course.export") && exportLogin.admin.permissions.includes("course.manage"), "course export account permissions are incorrect");

  const [courseRows] = await db.query(
    `SELECT c.id, c.title, c.completionThreshold,
            COALESCE(SUM(CASE WHEN o.status IN ('paid','partially_refunded','refunded') THEN o.amountFen ELSE 0 END), 0) AS grossAmountFen
       FROM courses c
       LEFT JOIN course_orders o ON o.courseId = c.id
      WHERE c.tenantId = ?
      GROUP BY c.id, c.title, c.completionThreshold
      ORDER BY grossAmountFen DESC, c.id ASC`,
    [tenantId]
  );
  assert(courseRows.length >= 2, "course insights acceptance requires at least two tenant courses");
  const financialCourse = courseRows[0];
  const lecturerCourses = await request("/admin/courses", lecturerToken);
  const lecturerCourse = lecturerCourses[0];
  assert(lecturerCourse, "lecturer has no assigned course");
  const crossCourse = courseRows.find((row) => Number(row.id) !== Number(lecturerCourse.id));
  assert(crossCourse, "cross-course sample is missing");

  const summary = await request(`/admin/courses/${financialCourse.id}/insights`, courseAdminToken);
  const [[orderDb]] = await db.query(`SELECT COUNT(*) AS orderCount, COALESCE(SUM(status IN ('paid','partially_refunded','refunded')),0) AS paidOrderCount, COALESCE(SUM(CASE WHEN status IN ('paid','partially_refunded','refunded') THEN amountFen ELSE 0 END),0) AS grossAmountFen FROM course_orders WHERE courseId=?`, [financialCourse.id]);
  const [[refundDb]] = await db.query(`SELECT COUNT(r.id) AS refundCount, COALESCE(SUM(r.amountFen),0) AS refundAmountFen FROM course_refunds r INNER JOIN course_orders o ON o.id=r.orderId WHERE o.courseId=? AND r.status='completed'`, [financialCourse.id]);
  const [[learningDb]] = await db.query(`SELECT COUNT(*) AS learnerCount, COALESCE(SUM(progress > 0),0) AS startedLearnerCount, COALESCE(SUM(completedAt IS NOT NULL OR progress >= ?),0) AS completedLearnerCount, COALESCE(AVG(progress),0) AS averageProgress FROM user_learning WHERE courseId=? AND lessonId=0`, [financialCourse.completionThreshold, financialCourse.id]);
  const [[certificateDb]] = await db.query(`SELECT COALESCE(SUM(status='active'),0) AS activeCertificateCount, COALESCE(SUM(status='revoked'),0) AS revokedCertificateCount FROM certificates WHERE courseId=? AND templateKey='course_completion'`, [financialCourse.id]);
  assertNumber(summary.kpis.orderCount, orderDb.orderCount, "order count");
  assertNumber(summary.kpis.paidOrderCount, orderDb.paidOrderCount, "paid order count");
  assertNumber(summary.kpis.grossAmountFen, orderDb.grossAmountFen, "gross amount");
  assertNumber(summary.kpis.refundCount, refundDb.refundCount, "refund count");
  assertNumber(summary.kpis.refundAmountFen, refundDb.refundAmountFen, "refund amount");
  assertNumber(summary.kpis.netAmountFen, Number(orderDb.grossAmountFen) - Number(refundDb.refundAmountFen), "net amount");
  assertNumber(summary.kpis.learnerCount, learningDb.learnerCount, "learner count");
  assertNumber(summary.kpis.startedLearnerCount, learningDb.startedLearnerCount, "started learner count");
  assertNumber(summary.kpis.completedLearnerCount, learningDb.completedLearnerCount, "completed learner count");
  assertNumber(summary.kpis.activeCertificateCount, certificateDb.activeCertificateCount, "active certificate count");
  assertNumber(summary.kpis.revokedCertificateCount, certificateDb.revokedCertificateCount, "revoked certificate count");
  assert(Math.abs(Number(summary.kpis.averageProgress) - Number(Number(learningDb.averageProgress).toFixed(2))) < 0.001, "average progress mismatch");

  const firstLearners = await request(`/admin/courses/${financialCourse.id}/learners?page=1&pageSize=100`, courseAdminToken);
  const learners = [...firstLearners.items];
  for (let page = 2; learners.length < firstLearners.total; page += 1) {
    const next = await request(`/admin/courses/${financialCourse.id}/learners?page=${page}&pageSize=100`, courseAdminToken);
    learners.push(...next.items);
  }
  assert(learners.length === firstLearners.total, `learner pagination mismatch: ${learners.length}/${firstLearners.total}`);
  assert(learners.every((row) => !/^1\d{10}$/.test(String(row.user?.phone || ""))), "learner API exposed an unmasked phone");
  assert(learners.every((row) => !Object.prototype.hasOwnProperty.call(row.user || {}, "passwordHash")), "learner API exposed passwordHash");
  const statusTotals = {};
  for (const status of ["not_started", "in_progress", "completed"]) statusTotals[status] = (await request(`/admin/courses/${financialCourse.id}/learners?status=${status}&page=1&pageSize=1`, courseAdminToken)).total;
  assert(Object.values(statusTotals).reduce((sum, value) => sum + Number(value), 0) === firstLearners.total, "learner status totals do not cover all learners");

  const adminExport = await binaryOutcome(`/admin/courses/${financialCourse.id}/insights/export`, courseAdminToken);
  assert(adminExport.ok && adminExport.contentType.includes("spreadsheetml"), `admin export failed: ${adminExport.status} ${adminExport.contentType}`);
  assert(adminExport.buffer.length > 3000, `admin export is unexpectedly small: ${adminExport.buffer.length}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(adminExport.buffer);
  assert(workbook.worksheets.map((sheet) => sheet.name).join("/") === "课程汇总/学员明细", "course export sheet names are incorrect");
  assert(workbook.getWorksheet("学员明细").actualRowCount === firstLearners.total + 1, "course export learner row count mismatch");

  const lecturerSummary = await request(`/admin/courses/${lecturerCourse.id}/insights`, lecturerToken);
  const lecturerLearners = await request(`/admin/courses/${lecturerCourse.id}/learners?page=1&pageSize=20`, lecturerToken);
  const lecturerExport = await binaryOutcome(`/admin/courses/${lecturerCourse.id}/insights/export`, lecturerToken);
  assert(lecturerExport.ok && lecturerExport.buffer.length > 3000, `lecturer export failed: ${lecturerExport.status}`);
  const [crossSummary, crossLearners, crossExport] = await Promise.all([
    outcome(`/admin/courses/${crossCourse.id}/insights`, lecturerToken),
    outcome(`/admin/courses/${crossCourse.id}/learners`, lecturerToken),
    binaryOutcome(`/admin/courses/${crossCourse.id}/insights/export`, lecturerToken)
  ]);
  assert(crossSummary.status === 404 && crossLearners.status === 404 && crossExport.status === 404, `lecturer cross-course boundary failed: ${crossSummary.status}/${crossLearners.status}/${crossExport.status}`);

  const noExportUsername = "showcase_course_no_export";
  const adminRows = await request(`/admin/admins?keyword=${encodeURIComponent(noExportUsername)}&includeSmoke=true&page=1&pageSize=100`, adminToken);
  let noExportAdmin = (adminRows.items || []).find((row) => row.username === noExportUsername);
  const noExportPayload = { username: noExportUsername, role: "operator", tenantId, permissions: ["course.manage"] };
  noExportAdmin = noExportAdmin
    ? await request(`/admin/admins/${noExportAdmin.id}`, adminToken, { method: "PATCH", body: JSON.stringify(noExportPayload) })
    : await request("/admin/admins", adminToken, { method: "POST", body: JSON.stringify({ ...noExportPayload, password }) });
  const noExportLogin = await request("/admin/auth/login", "", { method: "POST", body: JSON.stringify({ username: noExportUsername, password }) });
  assert(noExportLogin.admin.permissions.includes("course.manage") && !noExportLogin.admin.permissions.includes("course.export"), "no-export account permissions are incorrect");
  await request(`/admin/courses/${financialCourse.id}/insights`, noExportLogin.token);
  const [noExportWorkbook, noExportAttempts] = await Promise.all([
    binaryOutcome(`/admin/courses/${financialCourse.id}/insights/export`, noExportLogin.token),
    outcome("/admin/course-assessment-attempts-export", noExportLogin.token)
  ]);
  assert(noExportWorkbook.status === 403 && noExportAttempts.status === 403, `course export permission separation failed: ${noExportWorkbook.status}/${noExportAttempts.status}`);

  const outputDir = path.resolve(`.local-logs/course-insights-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, `course-${financialCourse.id}-insights.xlsx`), adminExport.buffer);
  const result = {
    ok: true,
    financialCourse: { id: Number(financialCourse.id), title: financialCourse.title, ...summary.kpis },
    learners: { total: firstLearners.total, statusTotals, exportedRows: workbook.getWorksheet("学员明细").actualRowCount - 1 },
    lecturer: { courseId: Number(lecturerCourse.id), learnerTotal: lecturerLearners.total, grossAmountFen: lecturerSummary.kpis.grossAmountFen, crossSummary: crossSummary.status, crossLearners: crossLearners.status, crossExport: crossExport.status, exportBytes: lecturerExport.buffer.length },
    noExportAccount: { id: noExportAdmin.id, username: noExportUsername, password, workbookStatus: noExportWorkbook.status, assessmentExportStatus: noExportAttempts.status },
    exportAccount: { id: exportAdmin.id, username: exportUsername, password },
    databaseMatched: true,
    export: { bytes: adminExport.buffer.length, sheets: workbook.worksheets.map((sheet) => sheet.name) },
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, outputDir }, null, 2));
} finally {
  await db.end();
}
