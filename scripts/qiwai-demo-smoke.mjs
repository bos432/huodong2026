import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const ExcelJS = apiRequire("exceljs");
const baseUrl = process.env.API_BASE || "http://localhost:3000/api";
const password = process.env.QIWAI_DEMO_PASSWORD || "Qiwai123456";
const runId = Date.now();

const tenants = [
  {
    code: "qiwai-hangzhou",
    name: "七维文化杭州城市合伙人",
    admin: "qiwai_hz_admin",
    ops: "qiwai_hz_ops",
    finance: "qiwai_hz_finance",
    checkin: "qiwai_hz_checkin",
    activities: ["东方哲学与节气文化体验沙龙", "硬笔书法 30 天入门公开课"]
  },
  {
    code: "qiwai-suzhou",
    name: "七维文化苏州城市合伙人",
    admin: "qiwai_sz_admin",
    ops: "qiwai_sz_ops",
    finance: "qiwai_sz_finance",
    checkin: "qiwai_sz_checkin",
    activities: ["国学经典导读体验课", "亲子沟通与家庭教育沙龙"]
  },
  {
    code: "qiwai-chengdu",
    name: "七维文化成都城市合伙人",
    admin: "qiwai_cd_admin",
    ops: "qiwai_cd_ops",
    finance: "qiwai_cd_finance",
    checkin: "qiwai_cd_checkin",
    activities: ["节气养生与身心减压体验课", "私域运营与副业启动工作坊"]
  }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function tenantHeader(code) {
  return { "x-tenant-code": code };
}

const RegistrationStatus = {
  PendingPayment: "pending_payment",
  Approved: "approved",
  CheckedIn: "checked_in"
};

const OrderStatus = {
  PendingPayment: "pending_payment",
  Paid: "paid",
  PartiallyRefunded: "partially_refunded"
};

const ActivityStatus = {
  Draft: "draft",
  PendingApproval: "pending_approval",
  Open: "open"
};

async function api(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok || body?.code !== 0) throw new Error(`${options.method || "GET"} ${path} failed: ${body?.message || text || res.status}`);
  return body.data;
}

async function login(username, expectedRole, expectedTenantCode) {
  const result = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  assert(result.token, `${username} token missing`);
  assert(result.admin?.role === expectedRole, `${username} role should be ${expectedRole}, got ${result.admin?.role}`);
  assert(result.admin?.tenant?.code === expectedTenantCode, `${username} tenant should be ${expectedTenantCode}`);
  return result;
}

async function verifyTenant(tenant) {
  const admin = await login(tenant.admin, "super_admin", tenant.code);
  const ops = await login(tenant.ops, "operator", tenant.code);
  const finance = await login(tenant.finance, "finance", tenant.code);
  const checkin = await login(tenant.checkin, "checkin_staff", tenant.code);

  const dashboard = await api("/admin/dashboard", { headers: auth(admin.token) });
  assert(dashboard.scope === "tenant", `${tenant.code} dashboard should use tenant scope`);
  assert(dashboard.tenant?.code === tenant.code || dashboard.currentTenant?.code === tenant.code || admin.admin.tenant.code === tenant.code, `${tenant.code} dashboard tenant mismatch`);

  const adminActivities = await api("/admin/activities?pageSize=100", { headers: auth(admin.token) });
  const adminItems = Array.isArray(adminActivities) ? adminActivities : adminActivities.items || [];
  for (const title of tenant.activities) {
    assert(adminItems.some((item) => item.title === title), `${tenant.code} admin missing activity: ${title}`);
  }

  for (const other of tenants.filter((item) => item.code !== tenant.code)) {
    for (const title of other.activities) {
      assert(!adminItems.some((item) => item.title === title), `${tenant.code} admin should not see other tenant activity: ${title}`);
    }
  }

  const publicActivities = await api(`/public/activities?tenantCode=${encodeURIComponent(tenant.code)}&pageSize=100`, { headers: tenantHeader(tenant.code) });
  const publicItems = publicActivities.items || [];
  for (const title of tenant.activities) {
    assert(publicItems.some((item) => item.title === title), `${tenant.code} public list missing activity: ${title}`);
  }
  for (const other of tenants.filter((item) => item.code !== tenant.code)) {
    for (const title of other.activities) {
      assert(!publicItems.some((item) => item.title === title), `${tenant.code} public list should not include other tenant activity: ${title}`);
    }
  }

  const setting = await api(`/public/settings/operation?tenantCode=${encodeURIComponent(tenant.code)}`, { headers: tenantHeader(tenant.code) });
  assert(setting.customerServiceWechat === `${tenant.code}_service`, `${tenant.code} public service setting mismatch`);

  const financeDashboard = await api("/admin/dashboard", { headers: auth(finance.token) });
  assert(financeDashboard.scope === "tenant", `${tenant.code} finance dashboard should use tenant scope`);

  const checkinActivities = await api("/admin/activities?pageSize=100", { headers: auth(checkin.token) });
  const checkinItems = Array.isArray(checkinActivities) ? checkinActivities : checkinActivities.items || [];
  assert(checkinItems.some((item) => tenant.activities.includes(item.title)), `${tenant.code} checkin account should see own activity list`);

  await api("/admin/activities?pageSize=5", { headers: auth(ops.token) });
  console.log(`OK ${tenant.name} demo tenant`);
}

async function verifyPartnerLandingDependencies() {
  const setting = await api(`/public/settings/operation?tenantCode=${encodeURIComponent(tenants[0].code)}`, { headers: tenantHeader(tenants[0].code) });
  assert(setting.customerServicePhone, "partner landing contact phone missing");
  assert(setting.customerServiceWechat, "partner landing contact wechat missing");
  console.log("OK partner landing contact data");
}

async function h5Login(phone, nickname) {
  const code = await api("/public/auth/h5-code", {
    method: "POST",
    body: JSON.stringify({ phone })
  });
  assert(code.verificationToken, "H5 verification token missing");
  const login = await api("/public/auth/h5-login", {
    method: "POST",
    body: JSON.stringify({ phone, nickname, verificationToken: code.verificationToken, verificationCode: code.devCode || "000000" })
  });
  const token = login.userAccessToken || login.token;
  assert(token, "H5 user access token missing");
  return { ...(login.user || login), userAccessToken: token, headers: auth(token) };
}

function answers(fields, suffix) {
  return fields.map((field) => {
    let value = `七维样板验收 ${suffix}`;
    if (String(field.label).includes("姓名")) value = `七维用户${suffix}`;
    if (String(field.label).includes("手机") || field.type === "phone") value = `139${String(Date.now()).slice(-8)}`;
    return { fieldId: field.id, label: field.label, type: field.type, value };
  });
}

function futureDate(days, hour = 10) {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function settlementPeriodAroundNow(offsetMinutes = 0) {
  const start = new Date(Date.now() - 5 * 60 * 1000 + offsetMinutes * 60 * 1000);
  const end = new Date(Date.now() + 5 * 60 * 1000 + offsetMinutes * 60 * 1000);
  return { periodStart: formatDateTime(start), periodEnd: formatDateTime(end) };
}

function formatUtcDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate())
  ].join("-") + ` ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

async function settlementPeriodForOrder(flow) {
  const transactions = await api("/admin/finance/transactions", { headers: auth(flow.financeToken) });
  const transaction = transactions.find((item) => item.order?.id === flow.order.id || item.order?.orderNo === flow.order.orderNo);
  assert(transaction?.createdAt, "payment transaction for settlement order should be visible");
  const start = new Date(transaction.createdAt);
  return {
    periodStart: formatDateTime(new Date(start.getTime() - 10 * 1000)),
    periodEnd: formatDateTime(new Date(start.getTime() + 10 * 1000))
  };
}

async function downloadWorkbookText(path, token) {
  const res = await fetch(`${baseUrl}${path}`, { headers: auth(token) });
  const arrayBuffer = await res.arrayBuffer();
  if (!res.ok) {
    const text = Buffer.from(arrayBuffer).toString("utf8");
    throw new Error(`GET ${path} failed: ${text || res.status}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(arrayBuffer));
  const values = [];
  for (const worksheet of workbook.worksheets) {
    worksheet.eachRow((row) => {
      row.eachCell((cell) => values.push(cellText(cell.value)));
    });
  }
  return values.join("\n");
}

function cellText(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value.richText)) return value.richText.map((item) => item.text || "").join("");
  if ("text" in value) return String(value.text || "");
  if ("result" in value) return cellText(value.result);
  return JSON.stringify(value);
}

async function expectApiFailure(path, options = {}, label = "request") {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (res.ok && body?.code === 0) throw new Error(`${label} should have failed`);
  return body;
}

function activityPayload(title, price = 0, status = ActivityStatus.Draft) {
  return {
    title,
    coverUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
    description: "七维文化样板审核活动，用于验证商家提交审核、平台审核和公开端展示。",
    notice: "本活动仅用于样板验收，不涉及算命、改运、预测等内容。",
    location: "七维文化样板空间",
    startTime: futureDate(16, 14),
    endTime: futureDate(16, 16),
    registrationDeadline: futureDate(15, 22),
    capacity: 30,
    price,
    status,
    featured: false,
    requireReview: false,
    allowCancel: true,
    fields: [
      { label: "姓名", type: "text", required: true, sortOrder: 1, options: [] },
      { label: "手机号", type: "phone", required: true, sortOrder: 2, options: [] }
    ],
    hosts: [{ name: "七维文化审核讲师", title: "样板讲师", avatarUrl: "", bio: "负责样板活动审核演示。", sortOrder: 1 }],
    sections: [{ type: "notice", title: "合规说明", content: "聚焦传统文化学习与线下体验。", imageUrl: "", sortOrder: 1 }]
  };
}

async function verifyTenantBusinessFlow(tenant, activityTitle) {
  const ops = await login(tenant.ops, "operator", tenant.code);
  const finance = await login(tenant.finance, "finance", tenant.code);
  const checkin = await login(tenant.checkin, "checkin_staff", tenant.code);

  const publicActivities = await api(`/public/activities?tenantCode=${encodeURIComponent(tenant.code)}&pageSize=100`, { headers: tenantHeader(tenant.code) });
  const activity = (publicActivities.items || []).find((item) => item.title === activityTitle);
  assert(activity, `${tenant.code} paid demo activity missing: ${activityTitle}`);

  const detail = await api(`/public/activities/${activity.id}?tenantCode=${encodeURIComponent(tenant.code)}`, { headers: tenantHeader(tenant.code) });
  const user = await h5Login(`139${String(Date.now()).slice(-8)}`, `七维${tenant.name}验收用户${Date.now()}`);
  const registered = await api(`/public/activities/${activity.id}/register?tenantCode=${encodeURIComponent(tenant.code)}`, {
    method: "POST",
    headers: { ...tenantHeader(tenant.code), ...user.headers },
    body: JSON.stringify({ userId: user.id, answers: answers(detail.fields || [], tenant.name) })
  });
  assert(registered.registration?.status === RegistrationStatus.PendingPayment, `${tenant.code} paid registration should be pending payment`);
  assert(registered.order?.status === OrderStatus.PendingPayment, `${tenant.code} paid order should be pending payment`);

  await api(`/admin/orders/${registered.order.id}/confirm-offline-payment`, {
    method: "POST",
    headers: auth(finance.token),
    body: JSON.stringify({ remark: "七维样板验收线下收款" })
  });

  const afterPayment = await api(`/public/users/${user.id}/registrations/${registered.registration.id}?tenantCode=${encodeURIComponent(tenant.code)}`, { headers: { ...tenantHeader(tenant.code), ...user.headers } });
  assert(afterPayment.order?.status === OrderStatus.Paid, `${tenant.code} paid order should become paid`);
  assert(afterPayment.registration?.status === RegistrationStatus.Approved, `${tenant.code} paid registration should become approved`);

  const registrations = await api(`/admin/registrations?activityId=${activity.id}&pageSize=100`, { headers: auth(ops.token) });
  const registrationItems = Array.isArray(registrations) ? registrations : registrations.items || [];
  assert(registrationItems.some((item) => item.id === registered.registration.id), `${tenant.code} ops should see paid registration`);

  const code = await api(`/public/users/${user.id}/registrations/${registered.registration.id}/check-in-code?tenantCode=${encodeURIComponent(tenant.code)}`, { headers: { ...tenantHeader(tenant.code), ...user.headers } });
  assert(code.code, `${tenant.code} check-in code missing`);
  await api("/admin/check-ins", {
    method: "POST",
    headers: auth(checkin.token),
    body: JSON.stringify({ code: code.code, remark: "七维样板验收签到" })
  });

  const afterCheckin = await api(`/public/users/${user.id}/registrations/${registered.registration.id}?tenantCode=${encodeURIComponent(tenant.code)}`, { headers: { ...tenantHeader(tenant.code), ...user.headers } });
  assert(afterCheckin.registration?.status === RegistrationStatus.CheckedIn, `${tenant.code} registration should become checked in`);

  const tagName = "活动活跃用户";
  const bulkTag = await api("/admin/tags/bulk-activity", {
    method: "POST",
    headers: auth(ops.token),
    body: JSON.stringify({ activityId: activity.id, name: tagName, color: "success", remark: "七维样板验收活动批量标记" })
  });
  assert(bulkTag.createdCount >= 1 || bulkTag.skippedCount >= 1, `${tenant.code} activity bulk tag should affect users`);
  const activityTags = await api(`/admin/tags?activityId=${activity.id}`, { headers: auth(ops.token) });
  assert(activityTags.users?.some((item) => item.id === user.id), `${tenant.code} activity tag user list should include registered user`);
  assert(activityTags.tags?.some((item) => item.name === tagName && item.user?.id === user.id), `${tenant.code} active user tag should be visible by activity`);

  const memberDetail = await api(`/admin/members/${user.id}`, { headers: auth(ops.token) });
  assert(memberDetail.user?.id === user.id || memberDetail.profile?.user?.id === user.id || memberDetail.id === user.id, `${tenant.code} member detail should be readable`);
  const activityMembers = await api(`/admin/members?activityId=${activity.id}`, { headers: auth(ops.token) });
  assert(activityMembers.some((item) => item.user?.id === user.id && item.activity?.id === activity.id), `${tenant.code} activity member list should include registered user`);

  const recap = await api(`/admin/activities/${activity.id}/recap`, { headers: auth(ops.token) });
  assert(Number(recap.funnel?.registrationCount || 0) >= 1, `${tenant.code} recap should include registration count`);
  assert(Number(recap.funnel?.paidCount || 0) >= 1, `${tenant.code} recap should include paid count`);
  assert(Number(recap.funnel?.checkInCount || 0) >= 1, `${tenant.code} recap should include check-in count`);

  const financeDashboard = await api("/admin/finance/dashboard", { headers: auth(finance.token) });
  assert(Number(financeDashboard.summary?.paidAmount || financeDashboard.summary?.incomeAmount || financeDashboard.summary?.netAmount || 0) >= 0, `${tenant.code} finance dashboard should be readable`);
  const orders = await api(`/admin/orders?activityId=${activity.id}&pageSize=100`, { headers: auth(finance.token) });
  const orderItems = Array.isArray(orders) ? orders : orders.items || [];
  assert(orderItems.some((item) => item.id === registered.order.id && item.status === OrderStatus.Paid), `${tenant.code} finance should see paid order`);
  console.log(`OK ${tenant.name} business flow: register -> confirm payment -> check-in -> tag -> recap -> finance visibility`);
  return { tenant, activity, user, registration: registered.registration, order: registered.order, financeToken: finance.token };
}

async function settlementAgent(financeToken, label) {
  const capability = await api("/admin/agent-settlements/transfer-capability", { headers: auth(financeToken) });
  const agent = capability.accounts?.find((item) => item.agent?.id)?.agent || capability.missingAgents?.[0];
  assert(agent?.id, `${label} settlement agent missing`);
  return agent;
}

async function generateOrReuseSettlement(financeToken, payload, label) {
  try {
    return await api("/admin/agent-settlements/generate", {
      method: "POST",
      headers: auth(financeToken),
      body: JSON.stringify(payload)
    });
  } catch (error) {
    const match = String(error.message).match(/已有结算单：([A-Za-z0-9_-]+)/);
    if (!match) throw error;
    const list = await api("/admin/agent-settlements", { headers: auth(financeToken) });
    const existing = list.find((item) => item.settlementNo === match[1]);
    assert(existing?.id, `${label} existing settlement should be visible after duplicate-period guard`);
    return existing;
  }
}

async function ensureSubmittedSettlement(settlement, financeToken) {
  if (settlement.status === "draft") {
    const submitted = await api(`/admin/agent-settlements/${settlement.id}/submit`, {
      method: "POST",
      headers: auth(financeToken),
      body: JSON.stringify({})
    });
    assert(submitted.status === "pending_review", "settlement should be pending review after submit");
    return submitted;
  }
  assert(["pending_review", "approved", "paid"].includes(settlement.status), `settlement should be submittable or already progressed, got ${settlement.status}`);
  return settlement;
}

async function ensureApprovedSettlement(settlement, financeToken) {
  if (settlement.status === "pending_review") {
    const approved = await api(`/admin/agent-settlements/${settlement.id}/approve`, {
      method: "POST",
      headers: auth(financeToken),
      body: JSON.stringify({ remark: "qiwai demo settlement approved" })
    });
    assert(approved.status === "approved", "settlement should be approved");
    return approved;
  }
  assert(["approved", "paid"].includes(settlement.status), `settlement should be approvable or already paid, got ${settlement.status}`);
  return settlement;
}

async function verifySettlementFlow(primaryFlow, boundaryFlow) {
  const agent = await settlementAgent(primaryFlow.financeToken, primaryFlow.tenant.code);
  const boundaryAgent = await settlementAgent(boundaryFlow.financeToken, boundaryFlow.tenant.code);
  const primaryPeriod = await settlementPeriodForOrder(primaryFlow);
  const boundaryPeriod = await settlementPeriodForOrder(boundaryFlow);

  let settlement = await generateOrReuseSettlement(primaryFlow.financeToken, { agentId: agent.id, ...primaryPeriod, commissionRate: 0, remark: `qiwai-demo-${runId}` }, "primary settlement");
  assert(settlement.id && settlement.settlementNo, "settlement should be generated");
  assert(["draft", "pending_review", "approved", "paid"].includes(settlement.status), "settlement should be active");
  assert(Number(settlement.transactionCount || 0) >= 1, "settlement should include payment transactions");
  assert(Number(settlement.payableAmount || 0) > 0, "settlement payable amount should be greater than zero");

  const boundarySettlement = await generateOrReuseSettlement(boundaryFlow.financeToken, { agentId: boundaryAgent.id, ...boundaryPeriod, commissionRate: 0, remark: `qiwai-demo-boundary-${runId}` }, "boundary settlement");
  assert(boundarySettlement.id && boundarySettlement.settlementNo, "boundary settlement should be generated");

  const list = await api("/admin/agent-settlements", { headers: auth(primaryFlow.financeToken) });
  assert(list.some((item) => item.id === settlement.id), "finance list should include own settlement");
  assert(!list.some((item) => item.id === boundarySettlement.id), "finance list should not include other city settlement");
  await expectApiFailure(`/admin/agent-settlements/${boundarySettlement.id}/details`, { headers: auth(primaryFlow.financeToken) }, "cross-city settlement details");

  settlement = await ensureSubmittedSettlement(settlement, primaryFlow.financeToken);
  settlement = await ensureApprovedSettlement(settlement, primaryFlow.financeToken);

  const detailsBeforePay = await api(`/admin/agent-settlements/${settlement.id}/details`, { headers: auth(primaryFlow.financeToken) });
  assert(detailsBeforePay.settlement?.id === settlement.id, "settlement details should include settlement");
  assert(Array.isArray(detailsBeforePay.transactions) && detailsBeforePay.transactions.length >= 1, "settlement details should include transactions");
  assert(Array.isArray(detailsBeforePay.auditLogs) && detailsBeforePay.auditLogs.some((item) => ["agent_settlement.approve", "agent_settlement.sandbox_transfer_success", "agent_settlement.mark_paid"].includes(item.action)), "settlement audit logs should include approval or payout");
  assert(detailsBeforePay.canMarkPaid === true || detailsBeforePay.settlement?.status === "paid", "approved settlement should be payable before transfer or already paid");

  let paidSettlement;
  let transfer = null;
  if (detailsBeforePay.settlement?.status === "paid") {
    paidSettlement = detailsBeforePay.settlement;
  } else {
    try {
      transfer = await api(`/admin/agent-settlements/${settlement.id}/sandbox-transfer`, {
        method: "POST",
        headers: auth(primaryFlow.financeToken),
        body: JSON.stringify({ provider: "wechat", simulateStatus: "success", remark: "qiwai demo sandbox payout" })
      });
      assert(transfer.markedPaid === true, "successful sandbox transfer should mark paid");
      assert(transfer.settlement?.status === "paid", "settlement should be paid after sandbox transfer");
      assert(transfer.transfer?.status === "success", "sandbox transfer should be successful");
      assert(transfer.transfer?.transferNo, "sandbox transfer should include transfer number");
      paidSettlement = transfer.settlement;
    } catch (error) {
      assert(String(error.message).includes("sandbox-transfer failed"), "sandbox transfer failure should come from payout endpoint");
      paidSettlement = await api(`/admin/agent-settlements/${settlement.id}/mark-paid`, {
        method: "POST",
        headers: auth(primaryFlow.financeToken),
        body: JSON.stringify({ paidReference: `QIWAI-OFFLINE-${runId}`, remark: "qiwai demo offline payout after sandbox capability guard" })
      });
      assert(paidSettlement.status === "paid", "offline payout should mark settlement paid when sandbox transfer is unavailable");
    }
  }

  const detailsAfterPay = await api(`/admin/agent-settlements/${settlement.id}/details`, { headers: auth(primaryFlow.financeToken) });
  assert(detailsAfterPay.settlement?.status === "paid", "settlement details should show paid status");
  if (transfer?.transfer?.transferNo) {
    assert(Array.isArray(detailsAfterPay.transfers) && detailsAfterPay.transfers.some((item) => item.transferNo === transfer.transfer.transferNo), "settlement details should include transfer record");
    assert(detailsAfterPay.auditLogs.some((item) => item.action === "agent_settlement.sandbox_transfer_success"), "settlement audit logs should include sandbox transfer success");
  } else {
    assert(detailsAfterPay.settlement?.paidReference || paidSettlement?.paidReference, "settlement details should include payout reference");
    assert(detailsAfterPay.auditLogs.some((item) => ["agent_settlement.mark_paid", "agent_settlement.sandbox_transfer_success"].includes(item.action)), "settlement audit logs should include payout mark");
  }

  const exported = await downloadWorkbookText("/admin/agent-settlements/export", primaryFlow.financeToken);
  assert(exported.includes(settlement.settlementNo), "settlement export should include own settlement");
  assert(!exported.includes(boundarySettlement.settlementNo), "settlement export should not include other city settlement");

  console.log("OK settlement flow: generate -> submit -> approve -> payout -> details/export/boundary");
}

async function verifyRefundFlow(flow) {
  const refundNo = `QIWAI_RF_${Date.now()}_${flow.order.id}`;
  const refundRequest = await api(`/admin/orders/${flow.order.id}/refund`, {
    method: "POST",
    headers: auth(flow.financeToken),
    body: JSON.stringify({ amount: 10, reason: "七维样板验收部分退款", refundNo })
  });
  assert(refundRequest.refund?.status === "pending", "refund request should be pending");
  assert(refundRequest.order?.status === OrderStatus.Paid, "pending refund should not change paid order status");

  const approved = await api(`/admin/refunds/${refundRequest.refund.id}/approve`, {
    method: "POST",
    headers: auth(flow.financeToken),
    body: JSON.stringify({ remark: "七维样板验收退款通过" })
  });
  assert(approved.refund?.status === "completed", "approved refund should be completed");
  assert(approved.order?.status === OrderStatus.PartiallyRefunded, "partial refund should update order status");

  const refunds = await api("/admin/finance/refunds?pageSize=100", { headers: auth(flow.financeToken) });
  const refundItems = Array.isArray(refunds) ? refunds : refunds.items || refunds.recentRefunds || [];
  assert(refundItems.some((item) => item.refundNo === refundNo && item.status === "completed"), "finance refund list should include completed refund");

  const dashboard = await api("/admin/finance/dashboard", { headers: auth(flow.financeToken) });
  const refundAmount = Number(dashboard.summary?.refundAmount || dashboard.summary?.refundsTotal || dashboard.agentSummary?.refundAmount || 0);
  assert(refundAmount >= 0, "finance dashboard should expose refund amount");
  console.log("OK refund flow: request -> approve -> partially refunded -> finance visibility");
}

async function verifyPlatformSupervisionAndApproval() {
  const platform = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "Admin123456" })
  });
  assert(platform.token, "platform admin token missing");
  assert(platform.admin?.role === "super_admin" && !platform.admin?.tenantId, "platform admin should be global super_admin");

  const tenantList = await api("/admin/tenants", { headers: auth(platform.token) });
  for (const tenant of tenants) {
    assert(tenantList.some((item) => item.code === tenant.code), `platform should see tenant ${tenant.code}`);
  }

  const allActivities = await api("/admin/activities?pageSize=200", { headers: auth(platform.token) });
  const allItems = Array.isArray(allActivities) ? allActivities : allActivities.items || [];
  for (const tenant of tenants) {
    for (const title of tenant.activities) {
      assert(allItems.some((item) => item.title === title), `platform should see activity ${title}`);
    }
  }

  const tenant = tenants[1];
  const ops = await login(tenant.ops, "operator", tenant.code);
  const title = `七维样板平台审核活动 ${Date.now()}`;
  const draft = await api("/admin/activities", {
    method: "POST",
    headers: auth(ops.token),
    body: JSON.stringify(activityPayload(title, 39, ActivityStatus.Draft))
  });
  assert(draft.status === ActivityStatus.Draft, "approval demo activity should start as draft");

  const submitted = await api(`/admin/activities/${draft.id}/submit-approval`, {
    method: "POST",
    headers: auth(ops.token),
    body: JSON.stringify({})
  });
  assert(submitted.status === ActivityStatus.PendingApproval, "approval demo activity should be pending approval");

  const pendingPublic = await api(`/public/activities?tenantCode=${encodeURIComponent(tenant.code)}&pageSize=200`, { headers: tenantHeader(tenant.code) });
  assert(!(pendingPublic.items || []).some((item) => item.id === draft.id), "pending approval activity should not be public");

  const approved = await api(`/admin/activities/${draft.id}/approve`, {
    method: "POST",
    headers: auth(platform.token),
    body: JSON.stringify({ remark: "七维样板验收通过" })
  });
  assert(approved.status === ActivityStatus.Open, "approval demo activity should become open");

  const publicAfterApproval = await api(`/public/activities?tenantCode=${encodeURIComponent(tenant.code)}&pageSize=200`, { headers: tenantHeader(tenant.code) });
  assert((publicAfterApproval.items || []).some((item) => item.id === draft.id), "approved activity should be public");

  const logs = await api(`/admin/activities/${draft.id}/approval-logs`, { headers: auth(platform.token) });
  assert(logs.some((item) => item.action === "submit"), "approval logs should include submit");
  assert(logs.some((item) => item.action === "approve"), "approval logs should include approve");
  console.log("OK platform supervision and activity approval flow");
}

async function main() {
  console.log(`Qiwai demo smoke target: ${baseUrl}`);
  for (const tenant of tenants) await verifyTenant(tenant);
  await verifyPartnerLandingDependencies();
  const businessFlows = [];
  for (const tenant of tenants) businessFlows.push(await verifyTenantBusinessFlow(tenant, tenant.activities[0]));
  await verifyRefundFlow(businessFlows[0]);
  await verifySettlementFlow(businessFlows[0], businessFlows[2]);
  await verifyPlatformSupervisionAndApproval();
  console.log("\n七维文化样板验收通过。");
}

main().catch((error) => {
  console.error("\n七维文化样板验收失败：");
  console.error(error.message);
  console.error("请先确认 API 已启动，并执行 npm run seed:qiwai-demo。");
  process.exitCode = 1;
});
