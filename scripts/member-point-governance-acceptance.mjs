import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { API_BASE, answers, api, assert, auth, loginAdmin, loginPlatformAdmin, pickList, tenantHeader } from "./online-showcase-lib.mjs";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");
const stamp = Date.now();
const runId = `member-point-governance-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
const tenantCode = process.env.TENANT_CODE || "qiwai-showcase";
const acceptancePassword = process.env.MEMBER_POINT_ACCEPTANCE_PASSWORD || "MemberPoints123456!";
const memberPassword = process.env.MEMBER_POINT_MEMBER_PASSWORD || "Qiwai123456";
let memberSequence = 0;
fs.mkdirSync(outputDir, { recursive: true });

const result = {
  runId,
  apiBase: API_BASE,
  database: process.env.DB_DATABASE || "activity_registration",
  startedAt: new Date().toISOString(),
  status: "running",
  checks: [],
  retained: {}
};

async function request(pathname, token, method = "GET", body, extraHeaders = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      ...(token ? auth(token) : {}),
      ...extraHeaders,
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload, data: payload?.data };
}

function expectStatus(response, statuses, label) {
  assert(statuses.includes(response.status), `${label} 应返回 ${statuses.join("/")}，实际 ${response.status}`);
}

function pointRulePayload(rule, overrides = {}) {
  return {
    enabled: rule.enabled,
    calculationMode: rule.calculationMode,
    fixedPoints: Number(rule.fixedPoints || 0),
    amountFenPerPoint: Number(rule.amountFenPerPoint || 100),
    growthMode: rule.growthMode,
    fixedGrowth: Number(rule.fixedGrowth || 0),
    validityDays: rule.validityDays == null ? null : Number(rule.validityDays),
    ...overrides
  };
}

async function ensureTenantAdmin(platformToken, tenantId, username, permissions) {
  const page = await api(`/admin/admins?includeSmoke=true&pageSize=100&keyword=${encodeURIComponent(username)}`, { headers: auth(platformToken) });
  const existing = pickList(page).find((row) => row.username === username);
  let row;
  if (existing) {
    row = await api(`/admin/admins/${existing.id}`, {
      method: "PATCH",
      headers: auth(platformToken),
      body: JSON.stringify({ role: "operator", tenantId, enabled: true, permissions })
    });
    await api(`/admin/admins/${existing.id}/password`, { method: "POST", headers: auth(platformToken), body: JSON.stringify({ password: acceptancePassword }) });
  } else {
    row = await api("/admin/admins", {
      method: "POST",
      headers: auth(platformToken),
      body: JSON.stringify({ username, password: acceptancePassword, role: "operator", tenantId, permissions })
    });
  }
  return { row, login: await loginAdmin(username, acceptancePassword) };
}

async function createMember(token, label) {
  memberSequence += 1;
  const phone = `13${String(stamp + memberSequence).slice(-9)}`;
  const created = await api("/admin/members", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ phone, password: memberPassword, nickname: `${label}-${stamp}`, remark: runId })
  });
  return { ...created, phone, password: memberPassword, userId: Number(created.user.id) };
}

async function loginMember(phone) {
  return api("/public/auth/password-login", {
    method: "POST",
    headers: tenantHeader(tenantCode),
    body: JSON.stringify({ phone, password: memberPassword })
  });
}

async function memberDetail(token, userId) {
  return api(`/admin/members/${userId}`, { headers: auth(token) });
}

async function findActivity(userToken, paid) {
  const page = await api(`/public/activities?tenantCode=${encodeURIComponent(tenantCode)}&page=1&pageSize=100`, {
    headers: { Authorization: `Bearer ${userToken}`, ...tenantHeader(tenantCode) }
  });
  for (const row of pickList(page)) {
    const detail = await api(`/public/activities/${row.id}?tenantCode=${encodeURIComponent(tenantCode)}`, { headers: tenantHeader(tenantCode) });
    const ticket = pickList(detail.ticketTypes).find((item) => paid ? Number(item.price || 0) > 0 : Number(item.price || 0) === 0);
    if (ticket && !detail.registrationClosed && !detail.registrationEnded) return { detail, ticket };
  }
  throw new Error(`未找到可报名的${paid ? "付费" : "免费"}活动`);
}

async function registerForActivity(userToken, activity, paymentMethod) {
  return api(`/public/activities/${activity.detail.id}/register?tenantCode=${encodeURIComponent(tenantCode)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}`, ...tenantHeader(tenantCode) },
    body: JSON.stringify({
      answers: answers(activity.detail.fields || [], runId.slice(-8)),
      ticketTypeId: activity.ticket.id,
      paymentMethod,
      privacyAccepted: true,
      source: runId
    })
  });
}

async function migrationAudit(connection) {
  const one = async (sql, params = []) => (await connection.query(sql, params))[0][0];
  const audit = {
    unrelatedRefundLogs: await one("SELECT SUM(sourceType = 'order_refund' AND relatedLogId IS NULL) activity, SUM(sourceType = 'mall_order_refund' AND relatedLogId IS NULL) mall FROM member_point_logs WHERE sourceType IN ('order_refund','mall_order_refund')"),
    repairLogs: await one("SELECT COUNT(*) total, COALESCE(SUM(points), 0) points FROM member_point_logs WHERE batchKey = 'migration:1783880000000:refund_clawback_repair'"),
    negativeAccounts: await one("SELECT COUNT(*) total FROM (SELECT userId, tenantScopeKey, SUM(CASE WHEN reversedAt IS NULL AND (expiresAt IS NULL OR expiresAt > NOW()) THEN points ELSE 0 END) balance FROM member_point_logs GROUP BY userId, tenantScopeKey HAVING balance < 0) accounts"),
    profileMismatch: await one("SELECT COUNT(*) total FROM member_profiles profile LEFT JOIN (SELECT userId, tenantScopeKey, GREATEST(SUM(CASE WHEN reversedAt IS NULL AND (expiresAt IS NULL OR expiresAt > NOW()) THEN points ELSE 0 END), 0) points FROM member_point_logs GROUP BY userId, tenantScopeKey) ledger ON ledger.userId = profile.userId AND ledger.tenantScopeKey = profile.tenantScopeKey WHERE profile.points <> COALESCE(ledger.points, 0)"),
    reviewScopeMismatch: await one("SELECT COUNT(*) total FROM member_point_logs pointLog JOIN activity_reviews review ON review.id = CAST(pointLog.sourceId AS UNSIGNED) JOIN activities activity ON activity.id = review.activityId WHERE pointLog.sourceType = 'activity_review' AND pointLog.tenantScopeKey <> IF(activity.tenantId IS NULL, 'platform', CONCAT('tenant:', activity.tenantId))")
  };
  for (const business of ["activity", "mall"]) {
    const orderTable = business === "activity" ? "orders" : "mall_orders";
    const refundTable = business === "activity" ? "refunds" : "mall_refunds";
    const earnedType = business === "activity" ? "order_paid" : "mall_order_paid";
    const refundType = business === "activity" ? "order_refund" : "mall_order_refund";
    const status = business === "activity" ? "completed" : "approved";
    const [rows] = await connection.query(`SELECT earned.id, earned.points earnedPoints, businessOrder.amountFen paidAmountFen, SUM(businessRefund.amountFen) refundedAmountFen, COALESCE((SELECT SUM(-COALESCE(NULLIF(claw.requestedPoints, 0), claw.points)) FROM member_point_logs claw WHERE claw.relatedLogId = earned.id AND claw.sourceType = ?), 0) actualClawback FROM member_point_logs earned JOIN ${orderTable} businessOrder ON businessOrder.id = CAST(earned.sourceId AS UNSIGNED) JOIN ${refundTable} businessRefund ON businessRefund.orderId = businessOrder.id AND businessRefund.status = ? WHERE earned.sourceType = ? AND businessOrder.amountFen > 0 GROUP BY earned.id, earned.points, businessOrder.amountFen`, [refundType, status, earnedType]);
    const mismatches = rows.filter((row) => {
      const paid = Number(row.paidAmountFen);
      const refunded = Math.min(Number(row.refundedAmountFen), paid);
      const earned = Number(row.earnedPoints);
      const target = refunded >= paid ? earned : Math.floor((earned * refunded) / paid);
      return target !== Number(row.actualClawback);
    });
    audit[`${business}RefundClawback`] = { accounts: rows.length, mismatch: mismatches.length };
  }
  return audit;
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration"
});

let originalPaidRule = null;
let manager = null;

try {
  const platform = await loginPlatformAdmin();
  const tenants = pickList(await api("/admin/tenants?page=1&pageSize=1000", { headers: auth(platform.token) }));
  const tenant = tenants.find((row) => row.code === tenantCode);
  const otherTenant = tenants.find((row) => row.id !== tenant?.id);
  assert(tenant?.id && otherTenant?.id, "积分治理验收需要两个可用租户");

  const managerPermissions = [
    "member.view", "member.manage", "member.password", "member.points.manage", "member.lifecycle.manage",
    "member_point_rule.view", "member_point_rule.manage", "activity.view", "registration.view",
    "registration.manage", "order.view", "order.manage", "order.refund", "finance.view", "finance.manage", "checkin.manage"
  ];
  manager = await ensureTenantAdmin(platform.token, tenant.id, "acceptance_member_points", managerPermissions);
  const viewer = await ensureTenantAdmin(platform.token, tenant.id, "acceptance_member_points_view", ["member.view", "member_point_rule.view"]);

  const platformRules = await api("/admin/member-point-rules", { headers: auth(platform.token) });
  const tenantRules = await api("/admin/member-point-rules", { headers: auth(manager.login.token) });
  assert(platformRules.length === 4 && platformRules.every((row) => row.tenantScopeKey === "platform"), "平台积分模板范围不正确");
  assert(tenantRules.length === 4 && tenantRules.every((row) => row.tenantScopeKey === `tenant:${tenant.id}`), "租户积分规则范围不正确");
  expectStatus(await request(`/admin/member-point-rules?tenantId=${otherTenant.id}`, manager.login.token), [404], "租户跨范围读取积分规则");
  expectStatus(await request(`/admin/member-point-rules/${platformRules[0].id}`, manager.login.token, "PATCH", pointRulePayload(platformRules[0])), [404], "租户跨范围更新平台积分规则");
  expectStatus(await request(`/admin/member-point-rules/${tenantRules[0].id}`, viewer.login.token, "PATCH", pointRulePayload(tenantRules[0])), [403], "只读账号更新积分规则");

  originalPaidRule = tenantRules.find((row) => row.eventType === "activity_order_paid");
  assert(originalPaidRule, "租户缺少活动支付积分规则");
  const updatedPaidRule = await api(`/admin/member-point-rules/${originalPaidRule.id}`, {
    method: "PATCH",
    headers: auth(manager.login.token),
    body: JSON.stringify(pointRulePayload(originalPaidRule, { enabled: true, calculationMode: "fixed", fixedPoints: 5, amountFenPerPoint: 100, growthMode: "none", fixedGrowth: 0, validityDays: null }))
  });
  assert(Number(updatedPaidRule.version) === Number(originalPaidRule.version) + 1, "积分规则更新后版本未递增");
  const [[ruleAudit]] = await connection.query("SELECT id, adminUsername, action, targetId, detail FROM admin_operation_logs WHERE action = 'member_point_rule.update' AND targetId = ? ORDER BY id DESC LIMIT 1", [String(originalPaidRule.id)]);
  assert(ruleAudit?.adminUsername === "acceptance_member_points" && Number(ruleAudit.detail?.version) === Number(updatedPaidRule.version), "积分规则审计记录不完整");
  result.checks.push({ name: "积分规则租户隔离、版本和审计", status: "passed", platformRuleCount: platformRules.length, tenantRuleCount: tenantRules.length, updatedVersion: updatedPaidRule.version });

  const concurrentMember = await createMember(manager.login.token, "积分并发会员");
  const concurrentKey = `${runId}:concurrent-award`;
  const concurrentResponses = await Promise.all(Array.from({ length: 10 }, () => request(`/admin/members/${concurrentMember.userId}/points/adjust`, manager.login.token, "POST", { points: 7, remark: `${runId}:并发幂等`, idempotencyKey: concurrentKey })));
  concurrentResponses.forEach((response, index) => expectStatus(response, [200, 201], `并发积分请求 ${index + 1}`));
  assert(concurrentResponses.filter((response) => response.data?.idempotent === false).length === 1, "并发积分请求应仅有一次真实写入");
  const [[concurrentLogCount]] = await connection.query("SELECT COUNT(*) total FROM member_point_logs WHERE userId = ? AND tenantScopeKey = ? AND sourceType = 'admin_point_adjust' AND remark = ?", [concurrentMember.userId, `tenant:${tenant.id}`, `${runId}:并发幂等`]);
  assert(Number(concurrentLogCount.total) === 1, "并发业务键产生了重复积分流水");
  expectStatus(await request(`/admin/members/${concurrentMember.userId}/points/adjust`, manager.login.token, "POST", { points: -999, remark: `${runId}:余额不足`, idempotencyKey: `${runId}:insufficient` }), [400], "普通扣减积分不足");
  result.checks.push({ name: "积分并发幂等和负余额拦截", status: "passed", requests: 10, ledgerRows: 1 });

  const refundMember = await createMember(manager.login.token, "积分退款欠额会员");
  const refundLogin = await loginMember(refundMember.phone);
  const paidActivity = await findActivity(refundLogin.userAccessToken, true);
  const registration = await registerForActivity(refundLogin.userAccessToken, paidActivity, "offline");
  assert(registration.order?.id, "付费活动报名未生成订单");
  const paid = await api(`/admin/orders/${registration.order.id}/confirm-offline-payment`, { method: "POST", headers: auth(manager.login.token), body: JSON.stringify({}) });
  assert((paid.order?.status || paid.status) === "paid", "线下收款后活动订单未支付");
  const [[earnedLog]] = await connection.query("SELECT id, points, ruleSnapshot FROM member_point_logs WHERE userId = ? AND tenantScopeKey = ? AND sourceType = 'order_paid' AND sourceId = ?", [refundMember.userId, `tenant:${tenant.id}`, String(registration.order.id)]);
  assert(Number(earnedLog?.points) === 5 && Number(earnedLog.ruleSnapshot?.version) === Number(updatedPaidRule.version), "活动支付未冻结当前租户积分规则");
  await api(`/admin/members/${refundMember.userId}/points/adjust`, { method: "POST", headers: auth(manager.login.token), body: JSON.stringify({ points: -5, remark: `${runId}:退款前用完积分`, idempotencyKey: `${runId}:spend-before-refund` }) });

  const [[orderRow]] = await connection.query("SELECT amountFen FROM orders WHERE id = ?", [registration.order.id]);
  const firstRefundFen = Math.max(Math.floor(Number(orderRow.amountFen) / 3), 1);
  const secondRefundFen = Number(orderRow.amountFen) - firstRefundFen;
  const refundIds = [];
  for (const [index, amountFen] of [firstRefundFen, secondRefundFen].entries()) {
    const createdRefund = await api(`/admin/orders/${registration.order.id}/refund`, {
      method: "POST",
      headers: auth(manager.login.token),
      body: JSON.stringify({ amount: amountFen / 100, reason: `${runId}:拆分退款${index + 1}`, refundNo: `MPG_${stamp}_${registration.order.id}_${index + 1}` })
    });
    const approved = await api(`/admin/refunds/${createdRefund.refund.id}/approve`, { method: "POST", headers: auth(manager.login.token), body: JSON.stringify({ remark: `${runId}:批准拆分退款${index + 1}` }) });
    assert(approved.refund?.status === "completed", `第 ${index + 1} 笔拆分退款未完成`);
    refundIds.push(createdRefund.refund.id);
  }
  const debtDetail = await memberDetail(manager.login.token, refundMember.userId);
  assert(Number(debtDetail.profile.points) === 0 && Number(debtDetail.profile.pointDebt) === 5, "退款扣回不足未形成完整积分欠额");
  const [refundLogs] = await connection.query("SELECT id, points, requestedPoints, relatedLogId, metadata FROM member_point_logs WHERE relatedLogId = ? AND sourceType = 'order_refund' ORDER BY id", [earnedLog.id]);
  assert(refundLogs.length === 2 && refundLogs.reduce((sum, row) => sum + Math.abs(Number(row.requestedPoints)), 0) === 5, "拆分退款累计扣回未精确命中原奖励");
  const detailRefundLogs = debtDetail.points.filter((row) => row.sourceType === "order_refund");
  assert(detailRefundLogs.length === 2, "租户会员详情未展示两条拆分退款积分流水");
  assert(detailRefundLogs.every((row) => Number(row.relatedLogId) === Number(earnedLog.id)), "退款积分流水未通过接口追溯到原奖励流水");
  assert(detailRefundLogs.reduce((sum, row) => sum + Math.abs(Number(row.requestedPoints)), 0) === 5, "会员详情未保留退款请求积分口径");
  await api(`/admin/members/${refundMember.userId}/points/adjust`, { method: "POST", headers: auth(manager.login.token), body: JSON.stringify({ points: 8, remark: `${runId}:欠额偿还后奖励`, idempotencyKey: `${runId}:debt-recovery` }) });
  const recoveredDetail = await memberDetail(manager.login.token, refundMember.userId);
  const [[recoveryLog]] = await connection.query("SELECT id, points, relatedLogId, metadata FROM member_point_logs WHERE userId = ? AND tenantScopeKey = ? AND sourceType = 'points_debt_recovery' ORDER BY id DESC LIMIT 1", [refundMember.userId, `tenant:${tenant.id}`]);
  assert(Number(recoveredDetail.profile.pointDebt) === 0 && Number(recoveredDetail.profile.points) === 3, "后续奖励未自动偿还积分欠额");
  assert(Number(recoveryLog?.points) === -5 && Number(recoveryLog?.metadata?.recoveredDebt) === 5, "积分欠额偿还流水不完整");
  const detailRecoveryLog = recoveredDetail.points.find((row) => Number(row.id) === Number(recoveryLog.id));
  assert(detailRecoveryLog?.sourceType === "points_debt_recovery" && Number(detailRecoveryLog.points) === -5, "租户会员详情未展示欠额偿还流水");
  assert(Number(detailRecoveryLog.relatedLogId) === Number(recoveryLog.relatedLogId), "欠额偿还流水未通过接口追溯到本次奖励流水");
  result.checks.push({ name: "拆分退款累计扣回、欠额和自动偿还", status: "passed", orderId: registration.order.id, refundIds, earnedPoints: 5, remainingPoints: 3 });

  const reviewMember = await createMember(manager.login.token, "积分评价租户会员");
  const reviewLogin = await loginMember(reviewMember.phone);
  const freeActivity = await findActivity(reviewLogin.userAccessToken, false);
  const freeRegistration = await registerForActivity(reviewLogin.userAccessToken, freeActivity, "offline");
  if (freeRegistration.registration?.status === "pending_review") {
    await api("/admin/registrations/bulk-approve", { method: "POST", headers: auth(manager.login.token), body: JSON.stringify({ ids: [freeRegistration.registration.id], remark: runId }) });
  }
  await api(`/admin/registrations/${freeRegistration.registration.id}/check-in`, { method: "POST", headers: auth(manager.login.token), body: JSON.stringify({ remark: runId }) });
  const review = await api(`/public/registrations/${freeRegistration.registration.id}/review?tenantCode=${encodeURIComponent(tenantCode)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${reviewLogin.userAccessToken}`, ...tenantHeader(tenantCode) },
    body: JSON.stringify({ rating: 5, content: `${runId} 评价积分租户归属验收` })
  });
  const [[reviewLog]] = await connection.query("SELECT id, tenantScopeKey, ruleSnapshot FROM member_point_logs WHERE userId = ? AND sourceType = 'activity_review' AND sourceId = ?", [reviewMember.userId, String(review.id)]);
  assert(reviewLog?.tenantScopeKey === `tenant:${tenant.id}` && reviewLog.ruleSnapshot?.eventType === "activity_review", "活动评价积分未落入活动租户规则");
  result.checks.push({ name: "活动评价积分租户归属", status: "passed", activityId: freeActivity.detail.id, registrationId: freeRegistration.registration.id, reviewId: review.id, pointLogId: reviewLog.id });

  const expiryMember = await createMember(manager.login.token, "积分到期批次会员");
  const expiring = await api(`/admin/members/${expiryMember.userId}/points/adjust`, { method: "POST", headers: auth(manager.login.token), body: JSON.stringify({ points: 50, remark: `${runId}:到期批次`, idempotencyKey: `${runId}:expiry-lot`, expiresAt: new Date(Date.now() + 10 * 86400000).toISOString() }) });
  const permanent = await api(`/admin/members/${expiryMember.userId}/points/adjust`, { method: "POST", headers: auth(manager.login.token), body: JSON.stringify({ points: 50, remark: `${runId}:长期批次`, idempotencyKey: `${runId}:permanent-lot` }) });
  const consumed = await api(`/admin/members/${expiryMember.userId}/points/adjust`, { method: "POST", headers: auth(manager.login.token), body: JSON.stringify({ points: -30, remark: `${runId}:优先消耗早到期批次`, idempotencyKey: `${runId}:consume-expiring-first` }) });
  await connection.query("UPDATE member_point_logs SET createdAt = DATE_SUB(NOW(), INTERVAL 3 HOUR), expiresAt = DATE_SUB(NOW(), INTERVAL 1 HOUR), expiryProcessedAt = NULL WHERE id = ?", [expiring.log.id]);
  await connection.query("UPDATE member_point_logs SET createdAt = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE id = ?", [permanent.log.id]);
  await connection.query("UPDATE member_point_logs SET createdAt = DATE_SUB(NOW(), INTERVAL 90 MINUTE) WHERE id = ?", [consumed.log.id]);
  const lifecycle = await api("/admin/members/lifecycle-scan", { method: "POST", headers: auth(manager.login.token), body: JSON.stringify({}) });
  const expiryDetail = await memberDetail(manager.login.token, expiryMember.userId);
  const [[expiryReconciliation]] = await connection.query("SELECT id, points, batchKey, metadata FROM member_point_logs WHERE userId = ? AND tenantScopeKey = ? AND sourceType = 'points_expiry_reconciliation' ORDER BY id DESC LIMIT 1", [expiryMember.userId, `tenant:${tenant.id}`]);
  assert(Number(expiryDetail.profile.points) === 50, "积分到期未按最早到期优先保留正确余额");
  assert(Number(expiryReconciliation?.points) === 30 && Number(expiryReconciliation?.metadata?.expiredPoints) === 20, "积分到期校准流水不正确");
  const detailExpiryReconciliation = expiryDetail.points.find((row) => Number(row.id) === Number(expiryReconciliation.id));
  assert(detailExpiryReconciliation?.sourceType === "points_expiry_reconciliation" && Number(detailExpiryReconciliation.points) === 30, "租户会员详情未展示积分到期校准流水");
  await api("/admin/members/lifecycle-scan", { method: "POST", headers: auth(manager.login.token), body: JSON.stringify({}) });
  const [[expiryReconciliationCount]] = await connection.query("SELECT COUNT(*) total FROM member_point_logs WHERE userId = ? AND tenantScopeKey = ? AND sourceType = 'points_expiry_reconciliation'", [expiryMember.userId, `tenant:${tenant.id}`]);
  assert(Number(expiryReconciliationCount.total) === 1, "积分到期批次重入产生重复校准流水");
  result.checks.push({ name: "积分批次过期、最早到期优先和重入幂等", status: "passed", lifecycleBatchKey: lifecycle.batchKey, reconciliationLogId: expiryReconciliation.id, remainingPoints: 50 });

  const audit = await migrationAudit(connection);
  assert(Number(audit.unrelatedRefundLogs.activity) === 0 && Number(audit.unrelatedRefundLogs.mall) === 0, "历史退款积分流水仍有未关联记录");
  assert(Number(audit.negativeAccounts.total) === 0 && Number(audit.profileMismatch.total) === 0, "积分账本与会员档案仍不一致");
  assert(Number(audit.reviewScopeMismatch.total) === 0, "历史评价积分仍有跨租户错配");
  assert(audit.activityRefundClawback.mismatch === 0 && audit.mallRefundClawback.mismatch === 0, "历史退款累计扣回仍存在差异");
  result.checks.push({ name: "历史积分账本迁移审计", status: "passed", audit });

  result.retained = {
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    acceptanceAccounts: [
      { username: "acceptance_member_points", password: acceptancePassword, role: "积分治理验收管理员" },
      { username: "acceptance_member_points_view", password: acceptancePassword, role: "积分规则只读验收员" }
    ],
    members: [concurrentMember, refundMember, reviewMember, expiryMember].map((member) => ({ userId: member.userId, phone: member.phone, password: member.password })),
    refundOrderId: registration.order.id,
    refundIds,
    reviewId: review.id,
    expiryReconciliationLogId: expiryReconciliation.id
  };
  result.status = "passed";
} catch (error) {
  result.status = "failed";
  result.error = error.stack || error.message;
  throw error;
} finally {
  if (originalPaidRule && manager?.login?.token) {
    try {
      const restored = await api(`/admin/member-point-rules/${originalPaidRule.id}`, { method: "PATCH", headers: auth(manager.login.token), body: JSON.stringify(pointRulePayload(originalPaidRule)) });
      result.restoredRule = { id: restored.id, eventType: restored.eventType, version: restored.version, matchesOriginalBehavior: ["enabled", "calculationMode", "fixedPoints", "amountFenPerPoint", "growthMode", "fixedGrowth", "validityDays"].every((key) => String(restored[key] ?? "") === String(originalPaidRule[key] ?? "")) };
      if (!result.restoredRule.matchesOriginalBehavior) result.status = "failed";
    } catch (error) {
      result.status = "failed";
      result.restoreError = error.stack || error.message;
    }
  }
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await connection.end();
  console.log(JSON.stringify(result, null, 2));
}
