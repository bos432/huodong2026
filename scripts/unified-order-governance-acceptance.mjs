import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");
const ExcelJS = require("exceljs");
const apiBase = String(process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const password = String(process.env.UNIFIED_ORDER_PASSWORD || "Qiwai123456");

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
  return { ok: response.ok, status: response.status, contentType: response.headers.get("content-type") || "", buffer };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSafePayload(value, label) {
  const text = JSON.stringify(value);
  for (const forbidden of ["passwordHash", "openid", "unionid", "providerRefundPayload", "addressSnapshot"]) assert(!text.includes(forbidden), `${label} exposed ${forbidden}`);
  const phones = text.match(/(?<!\d)1\d{10}(?!\d)/g) || [];
  assert(phones.length === 0, `${label} exposed ${phones.length} raw phone number(s)`);
}

const db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 13306), user: process.env.DB_USERNAME || "activity", password: process.env.DB_PASSWORD || "activitypass", database: process.env.DB_DATABASE || "activity_registration", timezone: "+08:00" });

try {
  const adminLogin = await request("/admin/auth/login", "", { method: "POST", body: JSON.stringify({ username: process.env.ADMIN_USERNAME || "showcase_admin", password: process.env.ADMIN_PASSWORD || password }) });
  const financeLogin = await request("/admin/auth/login", "", { method: "POST", body: JSON.stringify({ username: process.env.FINANCE_USERNAME || "showcase_finance", password: process.env.FINANCE_PASSWORD || password }) });
  const tenantId = Number(financeLogin.admin.tenantId || 0);
  assert(tenantId > 0, "finance account has no tenant");

  const [activityRows] = await db.query(
    `SELECT a.id, COUNT(o.id) AS orderCount
       FROM activities a
       INNER JOIN registrations r ON r.activityId = a.id
       INNER JOIN orders o ON o.registrationId = r.id
      WHERE a.tenantId = ?
      GROUP BY a.id
      ORDER BY orderCount DESC, a.id ASC
      LIMIT 2`,
    [tenantId]
  );
  assert(activityRows.length >= 2, "unified order acceptance requires two tenant activities with orders");
  const scopedActivityId = Number(activityRows[0].id);
  const crossActivityId = Number(activityRows[1].id);

  const username = "showcase_unified_order_read";
  const adminRows = await request(`/admin/admins?keyword=${encodeURIComponent(username)}&includeSmoke=true&page=1&pageSize=100`, adminLogin.token);
  let readAdmin = (adminRows.items || []).find((row) => row.username === username);
  const payload = { username, role: "operator", tenantId, permissions: ["order.view"], dataScope: { type: "activity_ids", activityIds: [scopedActivityId] } };
  readAdmin = readAdmin
    ? await request(`/admin/admins/${readAdmin.id}`, adminLogin.token, { method: "PATCH", body: JSON.stringify(payload) })
    : await request("/admin/admins", adminLogin.token, { method: "POST", body: JSON.stringify({ ...payload, password }) });
  const readLogin = await request("/admin/auth/login", "", { method: "POST", body: JSON.stringify({ username, password }) });
  assert(readLogin.admin.permissions.includes("order.view") && readLogin.admin.permissions.includes("course_order.view"), "read account did not inherit course order view");
  assert(!readLogin.admin.permissions.includes("order.export") && !readLogin.admin.permissions.includes("mall.order.view"), "read account has excessive permissions");

  const scopedActivityOrders = await request("/admin/unified-orders?businessType=activity&page=1&pageSize=100", readLogin.token);
  const [[scopedDb]] = await db.query(`SELECT COUNT(*) AS total FROM orders o INNER JOIN registrations r ON r.id=o.registrationId WHERE r.activityId=?`, [scopedActivityId]);
  assert(Number(scopedActivityOrders.total) === Number(scopedDb.total), `activity data scope total mismatch: ${scopedActivityOrders.total}/${scopedDb.total}`);
  assert(scopedActivityOrders.items.every((row) => row.businessType === "activity"), "activity filter returned another business type");
  assertSafePayload(scopedActivityOrders, "scoped activity order list");

  const [[crossOrder]] = await db.query(`SELECT o.id FROM orders o INNER JOIN registrations r ON r.id=o.registrationId WHERE r.activityId=? ORDER BY o.id DESC LIMIT 1`, [crossActivityId]);
  const [crossDetail, mallDenied, exportDenied] = await Promise.all([
    outcome(`/admin/unified-orders/activity/${crossOrder.id}`, readLogin.token),
    outcome("/admin/unified-orders?businessType=mall&page=1&pageSize=1", readLogin.token),
    binaryOutcome("/admin/unified-orders/export?businessType=course", readLogin.token)
  ]);
  assert(crossDetail.status === 404, `activity data scope detail boundary failed: ${crossDetail.status}`);
  assert(mallDenied.status === 403, `mall business permission boundary failed: ${mallDenied.status}`);
  assert(exportDenied.status === 403, `unified order export boundary failed: ${exportDenied.status}`);

  const financeList = await request("/admin/unified-orders?page=1&pageSize=100", financeLogin.token);
  assert(["activity", "course", "mall"].every((type) => financeList.availableBusinessTypes.includes(type)), `finance business types are incomplete: ${financeList.availableBusinessTypes}`);
  assertSafePayload(financeList, "finance unified order list");
  const detailResults = {};
  for (const type of ["activity", "course", "mall"]) {
    const sample = financeList.items.find((row) => row.businessType === type) || (await request(`/admin/unified-orders?businessType=${type}&page=1&pageSize=1`, financeLogin.token)).items[0];
    assert(sample, `${type} order sample is missing`);
    const detail = await request(`/admin/unified-orders/${type}/${sample.id}`, financeLogin.token);
    assert(Number(detail.amountFen) === Number(sample.amountFen), `${type} detail amount mismatch`);
    assert(detail.orderNo === sample.orderNo, `${type} detail order number mismatch`);
    assertSafePayload(detail, `${type} order detail`);
    const table = type === "activity" ? "orders" : type === "course" ? "course_orders" : "mall_orders";
    const [[dbOrder]] = await db.query(`SELECT orderNo, amountFen FROM ${table} WHERE id=?`, [sample.id]);
    assert(dbOrder?.orderNo === detail.orderNo && Number(dbOrder.amountFen) === Number(detail.amountFen), `${type} database reconciliation failed`);
    detailResults[type] = { id: sample.id, orderNo: sample.orderNo, amountFen: sample.amountFen, payments: detail.payments.length, refunds: detail.refunds.length, items: detail.items?.length || 0 };
  }

  const courseExport = await binaryOutcome("/admin/unified-orders/export?businessType=course", financeLogin.token);
  assert(courseExport.ok && courseExport.contentType.includes("spreadsheetml") && courseExport.buffer.length > 3000, `course unified export failed: ${courseExport.status}/${courseExport.buffer.length}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(courseExport.buffer);
  const courseList = await request("/admin/unified-orders?businessType=course&page=1&pageSize=1", financeLogin.token);
  assert(workbook.getWorksheet("统一订单").actualRowCount === Number(courseList.total) + 1, "unified course export row count mismatch");

  const outputDir = path.resolve(`.local-logs/unified-order-governance-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "unified-course-orders.xlsx"), courseExport.buffer);
  const result = {
    ok: true,
    tenantId,
    readAccount: { id: readAdmin.id, username, password, activityId: scopedActivityId, visibleActivityOrders: scopedActivityOrders.total, crossActivityDetail: crossDetail.status, mallList: mallDenied.status, export: exportDenied.status },
    finance: { username: financeLogin.admin.username, availableBusinessTypes: financeList.availableBusinessTypes, firstPageTotal: financeList.total, details: detailResults },
    export: { businessType: "course", rows: workbook.getWorksheet("统一订单").actualRowCount - 1, bytes: courseExport.buffer.length },
    databaseMatched: true,
    sensitivePayloadClean: true,
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, outputDir }, null, 2));
} finally {
  await db.end();
}
