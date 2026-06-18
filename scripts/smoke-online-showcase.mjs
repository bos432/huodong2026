import {
  API_BASE,
  TENANT_CODE,
  answers,
  api,
  assert,
  auth,
  demoUsers,
  loginPlatformAdmin,
  loginShowcaseAdmin,
  loginUser,
  pickList,
  reportStep,
  tenantHeader,
  tryApi,
  userAuth
} from "./online-showcase-lib.mjs";

const Status = {
  Approved: "approved",
  CheckedIn: "checked_in",
  Paid: "paid",
  PendingPayment: "pending_payment",
  PartiallyRefunded: "partially_refunded"
};

let runtimeUsers = new Map();

async function main() {
  console.log(`线上演示商家 smoke target: ${API_BASE}`);
  const admin = await loginShowcaseAdmin("showcase_admin");
  const platform = await loginPlatformAdmin();
  const ops = await loginShowcaseAdmin("showcase_ops");
  const finance = await loginShowcaseAdmin("showcase_finance");
  const checkin = await loginShowcaseAdmin("showcase_checkin");
  const tenantId = admin.admin?.tenant?.id || admin.admin?.tenantId;
  assert(tenantId, "演示商家管理员登录信息缺少 tenantId");
  runtimeUsers = await prepareSmokeUsers(admin.token, platform.token, tenantId);

  const publicHome = await api(`/public/homepage?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  assert(pickList(publicHome?.sections || publicHome).length || Array.isArray(publicHome), "H5 首页装修没有返回有效内容");
  reportStep("H5 首页装修可读取");

  const activities = pickList(await api(`/public/activities?tenantCode=${TENANT_CODE}&pageSize=100`, { headers: tenantHeader() }));
  const freeActivity = activities.find((item) => Number(item.price || 0) <= 0);
  const paidActivity = activities.find((item) => Number(item.price || 0) > 0);
  assert(activities.length >= 6, "演示活动不足 6 个");
  assert(freeActivity && paidActivity, "演示活动必须同时包含免费和收费活动");
  reportStep("活动列表包含免费和收费活动", `${activities.length} 个`);

  await freeRegistrationFlow(freeActivity, checkin.token);
  const paidFlow = await paidRegistrationFlow(paidActivity);
  await refundFlow(paidActivity, finance.token);
  await commentFlow(ops.token);
  await courseFlow(finance.token);
  await financeChecks(finance.token, paidFlow.order.id);

  console.log("\n线上演示商家闭环验收通过。");
  console.log(`演示入口：https://rd.chaimen666.com/?tenantCode=${TENANT_CODE}#/`);
}

async function freeRegistrationFlow(activity, checkinToken) {
  const demo = smokeUser("free");
  const user = await loginUser(demo.phone, demo.nickname);
  const detail = await api(`/public/activities/${activity.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  const registered = await api(`/public/activities/${activity.id}/register?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ answers: answers(detail.fields || [], "A"), source: "online-showcase-free" })
  });
  assert([Status.Approved, Status.CheckedIn].includes(registered.registration?.status), "免费报名后状态应为 approved 或 checked_in");
  const registrations = pickList(await api(`/public/me/registrations?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(registrations.some((item) => item.registration?.id === registered.registration.id || item.id === registered.registration.id), "我的报名列表缺少免费报名");
  const code = await api(`/public/me/registrations/${registered.registration.id}/check-in-code?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(code.code, "免费报名缺少签到码");
  const checkin = await api("/admin/check-ins", {
    method: "POST",
    headers: auth(checkinToken),
    body: JSON.stringify({ code: code.code, remark: "online-showcase 免费报名签到核销" })
  });
  assert(checkin.registration?.status === Status.CheckedIn || checkin.status === Status.CheckedIn, "免费报名核销后应为 checked_in");
  reportStep("免费报名闭环", "报名 -> 我的报名 -> 签到码 -> 后台核销");
}

async function paidRegistrationFlow(activity) {
  const demo = smokeUser("paid");
  const user = await loginUser(demo.phone, demo.nickname);
  const beforeWallet = await api(`/public/me/wallet?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(Number(beforeWallet.availableBalance || 0) >= Number(activity.price || 0), "收费报名用户余额不足，请先执行 seed");
  const detail = await api(`/public/activities/${activity.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  const registered = await api(`/public/activities/${activity.id}/register?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ answers: answers(detail.fields || [], "B"), ticketTypeId: detail.ticketTypes?.find((item) => Number(item.price || 0) > 0)?.id, source: "online-showcase-balance" })
  });
  assert(registered.order?.status === Status.PendingPayment, "收费报名应先生成待支付订单");
  const paid = await api(`/public/orders/${registered.order.id}/pay/balance?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({})
  });
  assert(paid.order?.status === Status.Paid, "余额支付后订单应为 paid");
  const afterWallet = await api(`/public/me/wallet?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(Number(afterWallet.availableBalance) < Number(beforeWallet.availableBalance), "余额支付后钱包余额应减少");
  const txs = pickList(await api(`/public/me/wallet/transactions?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(txs.some((item) => item.type === "balance_pay" && item.order?.id === paid.order.id), "余额支付流水缺失");
  reportStep("收费报名余额支付闭环", "报名 -> 订单 -> 余额扣款 -> 钱包流水");
  return { user, registration: paid.order.registration || registered.registration, order: paid.order };
}

async function refundFlow(activity, financeToken) {
  const demo = smokeUser("refund");
  const user = await loginUser(demo.phone, demo.nickname);
  const beforeWallet = await api(`/public/me/wallet?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  const detail = await api(`/public/activities/${activity.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  const registered = await api(`/public/activities/${activity.id}/register?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ answers: answers(detail.fields || [], "C"), ticketTypeId: detail.ticketTypes?.find((item) => Number(item.price || 0) > 0)?.id, source: "online-showcase-refund" })
  });
  const paid = await api(`/public/orders/${registered.order.id}/pay/balance?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({})
  });
  const userRequest = await tryApi(`/public/me/registrations/${registered.registration.id}/refund-request?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({})
  });
  const refundNo = `SHOWCASE_RF_${Date.now()}_${paid.order.id}`;
  const refundRequest = await api(`/admin/orders/${paid.order.id}/refund`, {
    method: "POST",
    headers: auth(financeToken),
    body: JSON.stringify({ amount: Math.min(10, Number(paid.order.amount || activity.price || 10)), reason: "online-showcase 余额支付退款验收", refundNo })
  });
  const approved = await api(`/admin/refunds/${refundRequest.refund.id}/approve`, {
    method: "POST",
    headers: auth(financeToken),
    body: JSON.stringify({ remark: "online-showcase 退款审核通过" })
  });
  assert(approved.refund?.status === "completed", "退款审核后状态应为 completed");
  assert([Status.PartiallyRefunded, "refunded"].includes(approved.order?.status), "退款后订单状态应更新为退款相关状态");
  const afterWallet = await api(`/public/me/wallet?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(Number(afterWallet.availableBalance) > Number(beforeWallet.availableBalance) - Number(paid.order.amount || activity.price || 0), "退款后余额应有退回");
  const txs = pickList(await api(`/public/me/wallet/transactions?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(txs.some((item) => item.type === "refund_return"), "退款返还流水缺失");
  reportStep("退款闭环", userRequest.ok ? "用户申请 -> 财务退款 -> 审核通过 -> 余额退回" : "财务退款 -> 审核通过 -> 余额退回");
}

async function commentFlow(opsToken) {
  const demo = smokeUser("comment");
  const user = await loginUser(demo.phone, demo.nickname);
  const posts = pickList(await api(`/public/community/posts?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(posts.length >= 8, "书院动态不足 8 条");
  const post = posts[0];
  const like = await api(`/public/community/posts/${post.id}/like?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({})
  });
  assert(typeof like.liked === "boolean", "点赞接口应返回 liked 状态");
  const created = await api(`/public/community/posts/${post.id}/comments?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ content: `online-showcase 评论审核验收 ${Date.now()}` })
  });
  assert(created.comment?.status === "pending", "评论提交后应为待审核");
  const pending = pickList(await api(`/admin/community-post-comments?status=pending&postId=${post.id}`, { headers: auth(opsToken) }));
  const target = pending.find((item) => item.id === created.comment.id);
  assert(target, "后台评论审核列表缺少新评论");
  await api(`/admin/community-post-comments/${target.id}`, {
    method: "PATCH",
    headers: auth(opsToken),
    body: JSON.stringify({ status: "approved", reviewRemark: "online-showcase 审核通过" })
  });
  const visible = pickList(await api(`/public/community/posts/${post.id}/comments?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(visible.some((item) => item.id === target.id), "评论审核通过后前台未展示");
  reportStep("动态点赞评论审核闭环", "点赞 -> 评论待审 -> 后台通过 -> 前台可见");
}

async function courseFlow(financeToken) {
  const demo = smokeUser("course");
  const user = await loginUser(demo.phone, demo.nickname);
  const courses = pickList(await api(`/public/courses?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }));
  const freeCourse = courses.find((item) => Number(item.price || 0) <= 0);
  const paidCourse = courses.find((item) => Number(item.price || 0) > 0);
  assert(courses.length >= 4 && freeCourse && paidCourse, "课程列表应包含免费和收费课程");
  const freeOrder = await api(`/public/courses/${freeCourse.id}/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({})
  });
  assert(freeOrder.owned === true, "免费课程下单后应立即拥有");
  const paidOrder = await api(`/public/courses/${paidCourse.id}/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ paymentMethod: "offline" })
  });
  assert(paidOrder.order?.status === Status.PendingPayment || paidOrder.owned === true, "收费课程应生成待确认订单或已拥有");
  if (!paidOrder.owned) {
    await api(`/admin/course-orders/${paidOrder.order.id}/confirm-offline-payment`, { method: "POST", headers: auth(financeToken), body: JSON.stringify({}) });
  }
  const player = await api(`/public/courses/${paidCourse.id}/player?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(player.owned === true, "收费课程后台确认后播放器应显示已拥有");
  const lesson = player.chapters?.flatMap((chapter) => chapter.lessons || []).find((item) => item.id);
  assert(lesson, "课程播放器缺少课时");
  await api(`/public/courses/${paidCourse.id}/progress?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ lessonId: lesson.id, progress: 35 })
  });
  const myCourses = pickList(await api(`/public/me/courses?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(myCourses.some((item) => item.id === paidCourse.id && Number(item.learning?.progress || 0) >= 0), "我的课程缺少已购课程或学习记录");
  reportStep("课程交付闭环", "下单 -> 后台确认 -> 播放权限 -> 学习进度 -> 我的课程");
}

async function prepareSmokeUsers(tenantAdminToken, platformToken, tenantId) {
  const base = 1000 + (Date.now() % 8000);
  const users = new Map();
  for (const [index, template] of demoUsers.entries()) {
    const phone = `1399000${String(base + index).padStart(4, "0")}`;
    const nickname = `${template.nickname}-${base + index}`;
    const profile = await api("/admin/members", {
      method: "POST",
      headers: auth(tenantAdminToken),
      body: JSON.stringify({ phone, password: process.env.SHOWCASE_PASSWORD, nickname, remark: "online-showcase smoke runtime user" })
    });
    const userId = profile?.user?.id || profile?.id || profile?.profile?.user?.id;
    assert(userId, `${phone} smoke 用户创建后无法识别用户ID`);
    if (["paid", "refund", "course"].includes(template.key)) {
      await api(`/admin/users/${userId}/wallet/adjust`, {
        method: "POST",
        headers: auth(platformToken),
        body: JSON.stringify({ tenantId, amount: 800, type: "recharge", remark: "online-showcase smoke runtime recharge" })
      });
    }
    users.set(template.key, { ...template, phone, nickname, userId });
  }
  reportStep("本次 smoke 独立用户已准备", Array.from(users.values()).map((item) => item.phone).join(" / "));
  return users;
}

function smokeUser(key) {
  const user = runtimeUsers.get(key);
  assert(user, `缺少 smoke 用户：${key}`);
  return user;
}

async function financeChecks(financeToken, orderId) {
  const orders = pickList(await api("/admin/orders?pageSize=100", { headers: auth(financeToken) }));
  assert(orders.some((item) => item.id === orderId), "财务订单列表缺少余额支付订单");
  const refunds = pickList(await api("/admin/finance/refunds?pageSize=100", { headers: auth(financeToken) }));
  assert(refunds.some((item) => item.status === "completed"), "财务退款列表缺少已完成退款");
  const walletTxs = pickList(await api("/admin/finance/wallet-transactions", { headers: auth(financeToken) }));
  assert(walletTxs.some((item) => ["admin_recharge", "balance_pay", "refund_return"].includes(item.type)), "财务钱包流水缺少演示交易");
  reportStep("财务后台可追溯", "订单、退款、余额流水可查");
}

main().catch((error) => {
  console.error("\n线上演示商家 smoke 失败：");
  console.error(error.message);
  console.error("请先执行 npm run seed:online-showcase，并确认 API_BASE、账号密码环境变量正确。");
  process.exitCode = 1;
});
