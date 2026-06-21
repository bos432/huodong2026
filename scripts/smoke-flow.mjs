const baseUrl = process.env.API_BASE || "http://localhost:3000/api";
const now = Date.now();

const ActivityStatus = { Open: "open" };
const FieldType = { Text: "text", Phone: "phone", Remark: "remark" };
const RegistrationStatus = {
  PendingPayment: "pending_payment",
  PendingReview: "pending_review",
  Approved: "approved",
  Cancelled: "cancelled",
  CheckedIn: "checked_in"
};
const OrderStatus = { PendingPayment: "pending_payment", Paid: "paid", Closed: "closed" };

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function futureDate(days, hour = 10) {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 19).replace("T", " ");
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
  assert(login.userAccessToken, "H5 user access token missing");
  return { ...(login.user || login), userAccessToken: login.userAccessToken, headers: auth(login.userAccessToken) };
}

function activityPayload({ title, price, requireReview, capacity = 20 }) {
  return {
    title,
    coverUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    description: "自动烟测创建的活动，用于验证上线前核心业务闭环。",
    notice: "这是烟测活动，可在后台下架。",
    location: "自动验收空间 A 厅",
    startTime: futureDate(14, 14),
    endTime: futureDate(14, 16),
    registrationDeadline: futureDate(13, 20),
    capacity,
    price,
    status: ActivityStatus.Open,
    featured: false,
    requireReview,
    allowCancel: true,
    fields: [
      { label: "姓名", type: FieldType.Text, required: true, sortOrder: 1, options: [] },
      { label: "手机号", type: FieldType.Phone, required: true, sortOrder: 2, options: [] },
      { label: "备注", type: FieldType.Remark, required: false, sortOrder: 3, options: [] }
    ],
    hosts: [{ name: "自动烟测主理人", title: "运营测试", avatarUrl: "", bio: "用于验证主理人展示和活动详情结构化内容。", sortOrder: 1 }],
    sections: [
      { type: "highlights", title: "活动亮点", content: "验证报名、审核、收款、签到和评价闭环。", imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80", sortOrder: 1 },
      { type: "agenda", title: "活动流程", content: "报名 - 审核/付款 - 签到 - 评价。", sortOrder: 2 }
    ]
  };
}

function answers(fields, suffix) {
  return fields.map((field) => {
    let value = "";
    if (field.label.includes("姓名")) value = `烟测用户${suffix}`;
    else if (field.label.includes("手机")) value = `139${String(now).slice(-8)}`;
    else value = `自动烟测 ${suffix}`;
    return { fieldId: field.id, label: field.label, type: field.type, value };
  });
}

async function createUser(suffix) {
  return h5Login(`139${String(now).slice(-6)}${suffix}`, `flow-user-${suffix}`);
}

async function createActivity(token, payload) {
  const activity = await api("/admin/activities", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
  assert(activity.sections?.some((section) => section.imageUrl), "Activity section image should be saved");
  return activity;
}

async function closeActivity(token, id) {
  return api(`/admin/activities/${id}/close`, { method: "POST", headers: auth(token), body: JSON.stringify({}) });
}

async function assertOperationLog(token, action, targetId, message) {
  const logs = await api("/admin/operation-logs", { headers: auth(token) });
  assert(logs.some((item) => item.action === action && item.targetId === String(targetId)), message);
}

async function runFreeFlow(token) {
  const activity = await createActivity(token, activityPayload({ title: `烟测免费活动 ${now}`, price: 0, requireReview: true }));
  const user = await createUser("01");
  const registrationResult = await api(`/public/activities/${activity.id}/register`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({ answers: answers(activity.fields, "免费") })
  });
  assert(registrationResult.registration.status === RegistrationStatus.PendingReview, "Free registration should be pending review");

  await api(`/admin/registrations/${registrationResult.registration.id}/approve`, {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ remark: "烟测审核通过" })
  });
  const approvedDetail = await api(`/public/me/registrations/${registrationResult.registration.id}`, { headers: user.headers });
  assert(approvedDetail.registration.status === RegistrationStatus.Approved, "Free registration should be approved");

  const code = await api(`/public/me/registrations/${registrationResult.registration.id}/check-in-code`, { headers: user.headers });
  assert(code.code, "Check-in code missing");
  await api("/admin/check-ins", { method: "POST", headers: auth(token), body: JSON.stringify({ code: code.code, remark: "烟测签到" }) });
  await assertOperationLog(token, "check_in.verify", registrationResult.registration.id, "Check-in operation should be audited");

  const checkedDetail = await api(`/public/me/registrations/${registrationResult.registration.id}`, { headers: user.headers });
  assert(checkedDetail.registration.status === RegistrationStatus.CheckedIn, "Registration should be checked in");

  const review = await api(`/public/registrations/${registrationResult.registration.id}/review`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({ rating: 5, content: "烟测评价：流程顺畅。" })
  });
  assert(review.id, "Review id missing");

  let duplicateFailed = false;
  try {
    await api("/admin/check-ins", { method: "POST", headers: auth(token), body: JSON.stringify({ code: code.code }) });
  } catch (error) {
    duplicateFailed = /已签到|重复/.test(error.message);
  }
  assert(duplicateFailed, "Duplicate check-in should fail clearly");
  await closeActivity(token, activity.id);
  console.log("OK free flow: review -> approve -> check-in -> review -> duplicate guard");
}

async function runPaidFlow(token) {
  const activity = await createActivity(token, activityPayload({ title: `烟测付费活动 ${now}`, price: 99, requireReview: false }));
  const user = await createUser("02");
  await api(`/admin/users/${user.id}/wallet/adjust`, {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ amount: 120, type: "recharge", remark: "flow smoke balance top-up" })
  });
  await assertOperationLog(token, "wallet.recharge", user.id, "Wallet recharge should be audited");
  const registrationResult = await api(`/public/activities/${activity.id}/register`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({ paymentMethod: "balance", answers: answers(activity.fields, "付费") })
  });
  assert(registrationResult.order.paymentMethod === "balance", "Paid flow should use balance payment");
  const detail = await api(`/public/me/registrations/${registrationResult.registration.id}`, { headers: user.headers });
  assert(detail.order.status === OrderStatus.Paid, "Paid order should become paid");
  assert(detail.registration.status === RegistrationStatus.Approved, "Paid no-review registration should become approved");
  await closeActivity(token, activity.id);
  console.log("OK paid flow: balance payment registration -> approved");
}

async function runExpiredOrderFlow(token) {
  const activity = await createActivity(token, activityPayload({ title: `烟测超时订单活动 ${now}`, price: 59, requireReview: false }));
  const user = await createUser("05");
  const registrationResult = await api(`/public/activities/${activity.id}/register`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({ answers: answers(activity.fields, "超时") })
  });
  assert(registrationResult.order.status === OrderStatus.PendingPayment, "Expiring order should start pending payment");
  assert(registrationResult.order.expiresAt, "Pending payment order should include expiresAt");

  const closeResult = await api("/admin/orders/close-expired", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ now: new Date(Date.now() + 3 * 86400000).toISOString() })
  });
  assert(closeResult.closedCount >= 1, "Expired order close should close at least one order");

  const detail = await api(`/public/me/registrations/${registrationResult.registration.id}`, { headers: user.headers });
  assert(detail.order.status === OrderStatus.Closed, "Expired order should become closed");
  assert(detail.order.closedAt, "Closed order should include closedAt");
  assert(detail.order.closeReason?.includes("超时"), "Closed order should include timeout reason");
  assert(detail.registration.status === RegistrationStatus.Cancelled, "Expired order should cancel registration");
  assert(detail.registration.cancelReason?.includes("超时"), "Cancelled registration should include timeout reason");
  await closeActivity(token, activity.id);
  console.log("OK expired order flow: pending payment -> auto close -> seat released");
}

async function runWaitlistAndTagFlow(token) {
  const activity = await createActivity(token, activityPayload({ title: `烟测候补活动 ${now}`, price: 0, requireReview: false, capacity: 1 }));
  const firstUser = await createUser("03");
  const secondUser = await createUser("04");
  const first = await api(`/public/activities/${activity.id}/register`, { method: "POST", headers: firstUser.headers, body: JSON.stringify({ answers: answers(activity.fields, "首位") }) });
  assert(first.registration.status === RegistrationStatus.Approved, "First user should occupy the only seat");
  const waitlisted = await api(`/public/activities/${activity.id}/register`, { method: "POST", headers: secondUser.headers, body: JSON.stringify({ answers: answers(activity.fields, "候补") }) });
  assert(waitlisted.waitlisted === true, "Second user should enter waitlist");
  assert(waitlisted.waitlist.status === "waiting", "Waitlist status should be waiting");

  const tag = await api("/admin/tags", { method: "POST", headers: auth(token), body: JSON.stringify({ userId: secondUser.id, name: "候补", color: "info", remark: "烟测候补用户" }) });
  assert(tag.id, "User tag should be created");
  const tags = await api(`/admin/tags?userId=${secondUser.id}`, { headers: auth(token) });
  assert(tags.some((item) => item.name === "候补"), "User tag list should contain waitlist tag");

  await api(`/admin/registrations/${first.registration.id}/cancel`, { method: "POST", headers: auth(token), body: JSON.stringify({ reason: "烟测释放名额" }) });
  const waitlists = await api(`/admin/waitlists?activityId=${activity.id}&status=waiting`, { headers: auth(token) });
  assert(waitlists.length >= 1, "Waiting list should be queryable");
  const promoted = await api(`/admin/waitlists/${waitlists[0].id}/promote`, { method: "POST", headers: auth(token), body: JSON.stringify({}) });
  assert(promoted.status === "promoted", "Waitlist should be promoted");
  await assertOperationLog(token, "waitlist.promote", waitlists[0].id, "Waitlist promotion should be audited");

  const thirdUser = await createUser("06");
  const cancelledWaitlist = await api(`/public/activities/${activity.id}/register`, { method: "POST", headers: thirdUser.headers, body: JSON.stringify({ answers: answers(activity.fields, "取消候补") }) });
  assert(cancelledWaitlist.waitlisted === true, "Third user should enter waitlist");
  await api(`/admin/waitlists/${cancelledWaitlist.waitlist.id}/cancel`, { method: "POST", headers: auth(token), body: JSON.stringify({ remark: "烟测取消候补" }) });
  await assertOperationLog(token, "waitlist.cancel", cancelledWaitlist.waitlist.id, "Waitlist cancellation should be audited");
  await closeActivity(token, activity.id);
  console.log("OK waitlist and tags: full activity -> waitlist -> tag -> promote -> cancel");
}

async function main() {
  console.log(`Flow smoke target: ${baseUrl}`);
  const health = await api("/health");
  assert(health.api === "up" && health.database === "up", "Health check failed");
  assert(health.release?.version && health.release?.commit, "Health check should include release metadata");
  const login = await api("/admin/auth/login", { method: "POST", body: JSON.stringify({ username: "admin", password: "Admin123456" }) });
  assert(login.token, "Admin token missing");

  await runFreeFlow(login.token);
  await runPaidFlow(login.token);
  await runExpiredOrderFlow(login.token);
  await runWaitlistAndTagFlow(login.token);
  console.log("\nFull business flow smoke test passed.");
}

main().catch((error) => {
  console.error("\nFull business flow smoke test failed:");
  console.error(error.message);
  process.exitCode = 1;
});
