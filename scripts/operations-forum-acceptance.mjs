import {
  API_BASE,
  TENANT_CODE,
  api,
  assert,
  auth,
  env,
  loginPlatformAdmin,
  loginShowcaseAdmin,
  pickList,
  reportStep,
  tenantHeader,
  userAuth
} from "./online-showcase-lib.mjs";

const showcasePassword = env("SHOWCASE_PASSWORD");
const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const testPhone = `13991${runId.slice(-6)}`;

async function main() {
  console.log(`运营成熟化 + 默认城市 + 论坛专项验收 target: ${API_BASE}`);
  const platform = await loginPlatformAdmin();
  const tenantAdmin = await loginShowcaseAdmin("showcase_admin");
  const user = await loginAcceptanceUser();

  await assertDefaultTenant(platform.token);
  await assertOverviewApis(platform.token, tenantAdmin.token);
  await forumFlow(tenantAdmin.token, user.userAccessToken);
  await volunteerCertificateFlow(platform.token, user.userAccessToken);

  console.log("\n运营成熟化 + 默认城市 + 论坛专项验收通过。");
  console.log(`测试用户：${testPhone} / ${showcasePassword}`);
}

async function loginAcceptanceUser() {
  const result = await api("/public/auth/password-login", {
    method: "POST",
    headers: tenantHeader(),
    body: JSON.stringify({ phone: testPhone, password: showcasePassword, nickname: `专项验收用户${runId.slice(-4)}` })
  });
  assert(result.userAccessToken, "专项验收用户登录未返回 token");
  return result;
}

async function assertDefaultTenant(platformToken) {
  const bootstrap = await api("/public/tenants/bootstrap");
  assert(bootstrap?.defaultTenant?.code === TENANT_CODE, `默认入口商家应为 ${TENANT_CODE}`);
  assert(bootstrap?.policy?.serverDefaultTenantCode === TENANT_CODE, "默认入口策略未返回 serverDefaultTenantCode");
  const setting = await api("/admin/settings/operation", { headers: auth(platformToken) });
  assert(setting.defaultTenantCode === TENANT_CODE, "平台运营设置 defaultTenantCode 未保存");
  reportStep("默认城市入口", `bootstrap/defaultTenantCode -> ${TENANT_CODE}`);
}

async function assertOverviewApis(platformToken, tenantToken) {
  const platformEndpoints = [
    "/admin/charity/overview",
    "/admin/ambassador/overview",
    "/admin/volunteer/overview"
  ];
  const tenantEndpoints = [
    "/admin/courses/overview",
    "/admin/community/overview",
    "/admin/forum/overview"
  ];
  for (const path of platformEndpoints) {
    const data = await api(path, { headers: auth(platformToken) });
    assert(data && typeof data.kpis === "object" && Array.isArray(data.todos), `${path} 返回结构不完整`);
  }
  for (const path of tenantEndpoints) {
    const data = await api(path, { headers: auth(tenantToken) });
    assert(data && typeof data.kpis === "object" && Array.isArray(data.todos), `${path} 返回结构不完整`);
  }
  reportStep("运营总览接口", "公益/大使/志愿者/课程/共修/论坛 overview 均返回 KPI 和待办");
}

async function forumFlow(adminToken, userToken) {
  const category = await api("/admin/forum/categories", {
    method: "POST",
    headers: auth(adminToken),
    body: JSON.stringify({
      name: `【验收】共修论坛 ${runId}`,
      description: "专项验收保留数据：版块、帖子、楼中楼、收藏、举报",
      sortOrder: 1,
      enabled: true,
      postPermission: "user",
      auditMode: "pre"
    })
  });
  assert(category.id, "论坛版块创建失败");

  const topicTitle = `【验收】默认城市论坛发帖 ${runId}`;
  const createdTopic = await api(`/public/forum/topics?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({
      categoryId: category.id,
      title: topicTitle,
      content: "这是一条保留的专项验收帖子，用于验证发帖审核、置顶、精华、收藏、举报和楼中楼回复。",
      tags: ["专项验收", "默认城市", "论坛"]
    })
  });
  assert(createdTopic.topic?.status === "pending", "预审版块发帖后应为 pending");

  const hiddenBeforeApprove = pickList(await api(`/public/forum/topics?tenantCode=${TENANT_CODE}&keyword=${encodeURIComponent(topicTitle)}`, { headers: userAuth(userToken) }));
  assert(!hiddenBeforeApprove.some((item) => item.id === createdTopic.topic.id), "pending 帖子不应出现在前台列表");

  const pendingTopics = pickList(await api(`/admin/forum/topics?status=pending&keyword=${encodeURIComponent(topicTitle)}`, { headers: auth(adminToken) }));
  const topic = pendingTopics.find((item) => item.id === createdTopic.topic.id);
  assert(topic?.id, "后台帖子审核列表未找到待审帖子");
  await api(`/admin/forum/topics/${topic.id}`, { method: "PATCH", headers: auth(adminToken), body: JSON.stringify({ status: "approved", reviewRemark: "专项验收通过" }) });
  await api(`/admin/forum/topics/${topic.id}/pin`, { method: "POST", headers: auth(adminToken), body: JSON.stringify({ pinned: true }) });
  await api(`/admin/forum/topics/${topic.id}/feature`, { method: "POST", headers: auth(adminToken), body: JSON.stringify({ featured: true }) });

  const detail = await api(`/public/forum/topics/${topic.id}?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) });
  assert(detail?.id === topic.id && detail.pinned && detail.featured, "帖子详情未展示审核/置顶/精华状态");

  const favorite = await api(`/public/forum/topics/${topic.id}/favorite?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken), body: JSON.stringify({}) });
  assert(favorite.favorited === true, "帖子收藏失败");
  const myFavorites = pickList(await api(`/public/me/forum/favorites?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }));
  assert(myFavorites.some((item) => item.topic?.id === topic.id), "我的收藏未返回该帖子");

  const replyResult = await api(`/public/forum/topics/${topic.id}/replies?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ content: "专项验收一级回复，等待审核。" })
  });
  assert(replyResult.reply?.status === "pending", "预审版块一级回复后应为 pending");
  await api(`/admin/forum/replies/${replyResult.reply.id}`, { method: "PATCH", headers: auth(adminToken), body: JSON.stringify({ status: "approved", reviewRemark: "一级回复通过" }) });

  const childReply = await api(`/public/forum/replies/${replyResult.reply.id}/replies?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ content: "专项验收楼中楼回复，等待审核。" })
  });
  assert(childReply.reply?.depth === 2 && childReply.reply.status === "pending", "楼中楼回复深度或状态不正确");
  await api(`/admin/forum/replies/${childReply.reply.id}`, { method: "PATCH", headers: auth(adminToken), body: JSON.stringify({ status: "approved", reviewRemark: "楼中楼通过" }) });

  const report = await api(`/public/forum/replies/${childReply.reply.id}/report?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ type: "content", description: "专项验收举报，不隐藏目标。" })
  });
  assert(report.report?.status === "pending", "举报提交后应为 pending");
  await api(`/admin/forum/reports/${report.report.id}`, { method: "PATCH", headers: auth(adminToken), body: JSON.stringify({ status: "resolved", handleRemark: "专项验收已处理", hideTarget: false }) });

  const finalDetail = await api(`/public/forum/topics/${topic.id}?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) });
  assert(finalDetail.replies?.some((item) => item.id === replyResult.reply.id && item.children?.some((child) => child.id === childReply.reply.id)), "帖子详情未返回楼中楼回复");
  const myTopics = pickList(await api(`/public/me/forum/topics?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }));
  const myReplies = pickList(await api(`/public/me/forum/replies?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }));
  assert(myTopics.some((item) => item.id === topic.id), "我的帖子缺少专项帖子");
  assert(myReplies.some((item) => item.id === replyResult.reply.id || item.id === childReply.reply.id), "我的回复缺少专项回复");
  reportStep("完整论坛 v1", "版块 -> 发帖待审 -> 审核 -> 置顶/精华 -> 收藏 -> 回复 -> 楼中楼 -> 举报处理");
}

async function volunteerCertificateFlow(platformToken, userToken) {
  const task = await api("/admin/volunteer/tasks", {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({
      title: `【验收】城市共建志愿任务 ${runId}`,
      type: "charity_execution",
      city: "演示城市",
      address: "慢π演示中心",
      startAt: "2099-01-01 09:00:00",
      endAt: "2099-01-01 12:00:00",
      quota: 20,
      status: "open",
      requirement: "专项验收任务，保留测试数据。",
      description: "用于验证志愿者报名、审核、服务记录、证书、公开核验和撤销。"
    })
  });
  assert(task.id, "志愿任务创建失败");

  const applied = await api(`/public/volunteer/tasks/${task.id}/apply`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({
      name: `验收志愿者${runId.slice(-4)}`,
      phone: testPhone,
      city: "演示城市",
      message: "专项验收报名"
    })
  });
  assert(applied.id, "志愿任务报名失败");

  await api(`/admin/volunteer/task-applications/${applied.id}`, {
    method: "PATCH",
    headers: auth(platformToken),
    body: JSON.stringify({ status: "approved", remark: "专项验收审核通过" })
  });
  const record = await api("/admin/volunteer/service-records", {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({
      applicationId: applied.id,
      hours: 3.5,
      title: "专项验收志愿服务记录",
      proofUrl: "https://example.com/acceptance-proof.jpg",
      feedback: "服务记录专项验收"
    })
  });
  assert(record.id, "服务记录创建失败");

  const profiles = pickList(await api(`/admin/volunteer/profiles?keyword=${encodeURIComponent(testPhone)}`, { headers: auth(platformToken) }));
  const profile = profiles.find((item) => item.phone === testPhone);
  assert(profile?.id && Number(profile.serviceHours || 0) >= 3.5 && profile.status === "approved", "志愿者档案未累计时长或未通过");
  const issued = await api(`/admin/volunteer/profiles/${profile.id}/certificates`, {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({ name: "城市共建者证书", templateKey: "city_builder" })
  });
  assert(issued.certificateNo, "证书发放后缺少编号");

  const myCertificates = pickList(await api("/public/me/certificates", { headers: userAuth(userToken) }));
  assert(myCertificates.some((item) => item.certificateNo === issued.certificateNo), "我的证书未展示新证书");
  const verified = await api(`/public/certificates/${encodeURIComponent(issued.certificateNo)}/verify`);
  assert(verified.verify?.valid === true && verified.holderName?.includes("*"), "公开证书核验应有效且姓名脱敏");
  const revoked = await api(`/admin/volunteer/certificates/${issued.id}/revoke`, {
    method: "PATCH",
    headers: auth(platformToken),
    body: JSON.stringify({ reason: "专项验收撤销测试" })
  });
  assert(revoked.status === "revoked", "证书撤销失败");
  const revokedVerify = await api(`/public/certificates/${encodeURIComponent(issued.certificateNo)}/verify`);
  assert(revokedVerify.verify?.valid === false, "撤销后公开核验应显示无效");
  reportStep("志愿者证书闭环", "任务 -> 报名 -> 审核 -> 服务记录 -> 自动累计 -> 发证 -> 我的证书 -> 公开核验 -> 撤销");
}

main().catch((error) => {
  console.error("\n运营成熟化 + 默认城市 + 论坛专项验收失败：");
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
