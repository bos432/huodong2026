import {
  API_BASE,
  SCENARIO,
  TENANT_CODE,
  TENANT_NAME,
  api,
  assert,
  auth,
  cover,
  demoUsers,
  env,
  futureDate,
  loginPlatformAdmin,
  loginShowcaseAdmin,
  pickList,
  reportStep,
  tenantHeader,
  todayDate
} from "./online-showcase-lib.mjs";

const showcasePassword = env("SHOWCASE_PASSWORD");

const permissions = [
  "dashboard.view",
  "tenant.manage",
  "admin.manage",
  "activity.manage",
  "registration.manage",
  "order.manage",
  "finance.manage",
  "wallet.manage",
  "member.manage",
  "homepage.manage",
  "announcement.manage",
  "operation_settings.manage",
  "course.manage",
  "community.manage",
  "checkin.manage",
  "logs.view",
  "system.manage",
  "miniprogram_release.manage"
];

const accounts = [
  { username: "showcase_admin", role: "super_admin", permissions },
  { username: "showcase_ops", role: "operator", permissions: permissions.filter((item) => !item.startsWith("finance") && item !== "wallet.manage") },
  { username: "showcase_finance", role: "finance", permissions: ["dashboard.view", "order.manage", "finance.manage", "wallet.manage", "member.manage"] },
  { username: "showcase_checkin", role: "checkin_staff", permissions: ["dashboard.view", "activity.manage", "registration.manage", "checkin.manage"] }
];

const activities = [
  ["【演示】国学经典晨读体验营", 0, "国学", "清晨共读经典片段，用 60 分钟体验书院式学习节奏。"],
  ["【演示】硬笔书法入门公开课", 0, "书法", "从握笔、坐姿、基础笔画开始，适合零基础成人和亲子家庭。"],
  ["【演示】节气养生与身心舒展", 0, "身心健康", "结合节气生活方式、呼吸放松和轻运动，做一场温和体验课。"],
  ["【演示】家庭教育沟通工作坊", 59, "家庭教育", "拆解亲子沟通场景，用练习帮助家长建立更稳定的表达方式。"],
  ["【演示】东方美学书法半日课", 99, "书法", "半日沉浸式书法与东方美学体验，适合高意向用户转化。"],
  ["【演示】个人成长与副业定位课", 199, "创业技能", "帮助学员梳理个人优势、服务定位和下一步行动计划。"]
];

const courses = [
  ["【演示】国学入门十分钟", 0, "七维导学老师", ["国学", "体验课"]],
  ["【演示】书法基础体验课", 0, "书法主理人", ["书法", "免费体验"]],
  ["【演示】传统文化系统课", 299, "七维书院讲师团", ["传统文化", "系统课"]],
  ["【演示】家庭教育进阶课", 199, "家庭教育顾问", ["家庭教育", "进阶"]]
];

const posts = [
  "今天的晨读从《大学》开篇讲起，学员反馈最有收获的是把经典句子落回到日常选择里。",
  "书法体验课现场：横画不只是写直，更是在练稳定、呼吸和观察力。",
  "家庭教育沙龙复盘：先处理情绪，再处理事情，是很多家长今天带走的一句话。",
  "节气身心课预告：这周我们会从饮食、睡眠和轻运动三个角度做生活方式练习。",
  "学员笔记精选：学习传统文化不是背答案，而是多一个看世界的角度。",
  "城市书院日常：下午的空间很安静，适合阅读、抄写，也适合和自己待一会儿。",
  "共修打卡第 7 天：有人开始早睡，有人开始每天读 10 分钟书，小变化会积累。",
  "创业技能小课预告：用一页纸梳理你的用户、产品和第一次成交路径。"
];

async function main() {
  console.log(`线上演示商家 seed target: ${API_BASE}`);
  const platform = await loginPlatformAdmin();
  const tenant = await ensureTenant(platform.token);
  await ensureTenantRegion(platform.token, tenant.id);
  await ensureAccounts(platform.token, tenant.id);

  const showcaseAdmin = await loginShowcaseAdmin("showcase_admin");
  await ensureOperationSettings(showcaseAdmin.token);
  await ensureHomepage(showcaseAdmin.token);
  await ensureAnnouncements(showcaseAdmin.token);
  await ensureActivities(showcaseAdmin.token);
  await ensureCourses(showcaseAdmin.token);
  await ensureCommunity(showcaseAdmin.token);
  await ensureMembersAndWallets(showcaseAdmin.token, platform.token, tenant.id);

  console.log("\n线上演示商家数据已准备完成。");
  console.log(`H5 演示入口：https://rd.chaimen666.com/?tenantCode=${TENANT_CODE}#/`);
  console.log("后台账号：showcase_admin / showcase_ops / showcase_finance / showcase_checkin");
  console.log("演示用户手机号：13990000001 - 13990000005，密码使用 SHOWCASE_PASSWORD。");
}

async function ensureTenant(token) {
  const tenants = await api("/admin/tenants", { headers: auth(token) });
  const payload = {
    code: TENANT_CODE,
    name: TENANT_NAME,
    region: "演示城市",
    contactName: "七维演示运营",
    contactPhone: "13990009999",
    enabled: true,
    settings: {
      demoScenario: SCENARIO,
      h5Domain: "rd.chaimen666.com",
      brandLogoUrl: cover(0),
      activityPublishReviewRequired: false,
      registrationReviewEnabled: false,
      paymentAccountEditable: true
    },
    remark: `demoScenario:${SCENARIO}`
  };
  let tenant = tenants.find((item) => item.code === TENANT_CODE);
  tenant = tenant
    ? await api(`/admin/tenants/${tenant.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
    : await api("/admin/tenants", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
  await api(`/admin/tenants/${tenant.id}/permissions`, {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ activityPublishReviewRequired: false, registrationReviewEnabled: false, paymentAccountEditable: true })
  });
  reportStep("演示商家已创建/更新", `${tenant.name}(${tenant.code})`);
  return tenant;
}

async function ensureTenantRegion(token, tenantId) {
  const regions = await api(`/admin/tenant-regions?tenantId=${tenantId}`, { headers: auth(token) });
  const existing = pickList(regions).find((item) => item.name === "演示城市核心区");
  const payload = {
    tenantId,
    province: "重庆市",
    city: "重庆市",
    district: "铜梁区",
    name: "演示城市核心区",
    latitude: 29.844,
    longitude: 106.056,
    radiusMeters: 20000,
    exclusive: true,
    priority: 100,
    enabled: true,
    remark: `demoScenario:${SCENARIO}`
  };
  if (existing) await api(`/admin/tenant-regions/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) });
  else await api("/admin/tenant-regions", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
  reportStep("区域保护演示范围已配置");
}

async function ensureAccounts(token, tenantId) {
  const admins = pickList(await api(`/admin/admins?includeSmoke=true&pageSize=200`, { headers: auth(token) }));
  for (const account of accounts) {
    const payload = { username: account.username, password: showcasePassword, role: account.role, tenantId, permissions: account.permissions };
    const existing = admins.find((item) => item.username === account.username);
    if (existing) {
      await api(`/admin/admins/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify({ role: account.role, tenantId, enabled: true, permissions: account.permissions }) });
      await api(`/admin/admins/${existing.id}/password`, { method: "POST", headers: auth(token), body: JSON.stringify({ password: showcasePassword }) });
    } else {
      await api("/admin/admins", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
    }
  }
  reportStep("演示后台账号已创建/更新");
}

async function ensureOperationSettings(token) {
  await api("/admin/settings/operation", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({
      registrationEnabled: true,
      registrationDisabledMessage: "",
      offlinePaymentInstructions: "演示商家支持免费报名、余额支付和线下收款确认。真实微信/支付宝未配置时不能假成功。",
      paymentMethods: { free: true, balance: true, offline: true, wechat: false, alipay: false },
      customerServiceName: "七维演示客服",
      customerServicePhone: "13990009999",
      customerServiceWechat: "qiwai_showcase_service",
      defaultGroupQrCodeUrl: "",
      refundInstructions: "演示退款用于验收余额退回、订单状态和财务记录。",
      invoiceInstructions: "演示订单如需发票，请联系演示客服登记开票信息。",
      pageTheme: {
        brandName: TENANT_NAME,
        slogan: "传统文化、课程学习、活动报名一站式演示中心",
        primaryColor: "#8B5A2B",
        accentColor: "#D8A24A",
        logoUrl: cover(1),
        demoScenario: SCENARIO
      }
    })
  });
  reportStep("运营设置已配置");
}

async function ensureHomepage(token) {
  await api("/admin/homepage/sections/reset-default?pageKey=home", { method: "POST", headers: auth(token), body: JSON.stringify({}) });
  const sections = await api("/admin/homepage/sections?pageKey=home", { headers: auth(token) });
  for (const item of sections) {
    await api(`/admin/homepage/sections/${item.id}?pageKey=home`, { method: "DELETE", headers: auth(token) });
  }
  const payloads = [
    {
      type: "hero",
      title: "七维书院演示中心",
      subtitle: "活动报名、课程学习、共修打卡、动态互动完整闭环",
      sortOrder: 1,
      config: { imageUrl: cover(2), link: "/pages/activity/list", buttonText: "查看活动", demoScenario: SCENARIO },
      layout: { highlighted: true }
    },
    {
      type: "quick_nav",
      title: "运营功能入口",
      subtitle: "用户能快速进入报名、课程、共修和个人中心",
      sortOrder: 2,
      config: {
        items: [
          { label: "活动报名", path: "/pages/activity/list" },
          { label: "课程学习", path: "/pages/courses/index" },
          { label: "共修打卡", path: "/pages/community/checkin" },
          { label: "书院动态", path: "/pages/community/posts" }
        ],
        demoScenario: SCENARIO
      }
    },
    { type: "featured_activities", title: "近期精选活动", subtitle: "免费体验 + 收费工作坊", sortOrder: 3, config: { source: "featured", limit: 6, demoScenario: SCENARIO }, layout: { display: "horizontal", spacingBottom: 18 } },
    { type: "activity_tabs", title: "按兴趣找活动", subtitle: "国学、书法、家庭教育、身心成长", sortOrder: 4, config: { includeHot: true, limit: 8, demoScenario: SCENARIO }, layout: { spacingBottom: 12 } },
    { type: "activity_feed", title: "全部演示活动", subtitle: "用于验证报名、支付、退款和签到闭环", sortOrder: 5, config: { source: "latest", limit: 10, pageSize: 4, pagination: "pager", demoScenario: SCENARIO }, layout: { display: "list" } },
    { type: "image_banner", title: "课程学习专区", subtitle: "体验课与系统课同步展示", sortOrder: 6, config: { imageUrl: cover(4), link: "/pages/courses/index", demoScenario: SCENARIO }, layout: { spacingBottom: 14, background: "#F7E7D0" } },
    { type: "rich_text", title: "书院动态与评论审核", subtitle: "动态内容已在共修/动态页面生成", sortOrder: 7, config: { content: "演示数据包含 8 条书院动态，支持用户点赞、提交评论、后台审核后前台展示。", link: "/pages/community/posts", demoScenario: SCENARIO }, layout: { spacingBottom: 18 } },
    {
      type: "bottom_nav",
      title: "底部导航",
      sortOrder: 99,
      config: {
        items: [
          { label: "书院", icon: "书", activeIcon: "书", link: "/pages/index/index", action: "mainPage", color: "#8B5A2B" },
          { label: "课程", icon: "课", activeIcon: "课", link: "/pages/courses/index", action: "mainPage", color: "#8B5A2B" },
          { label: "共修", icon: "修", activeIcon: "修", link: "/pages/community/index", action: "mainPage", color: "#8B5A2B" },
          { label: "活动", icon: "活", activeIcon: "活", link: "/pages/activity/list", action: "mainPage", color: "#8B5A2B" },
          { label: "我的", icon: "我", activeIcon: "我", link: "/pages/user/my", action: "mainPage", color: "#8B5A2B" }
        ],
        demoScenario: SCENARIO
      },
      layout: { backgroundColor: "#ffffff", activeColor: "#8B5A2B", textColor: "#7A6858" }
    },
    {
      type: "my_page",
      title: "我的书院",
      subtitle: "报名、订单、课程、钱包和管理入口",
      sortOrder: 100,
      config: {
        greeting: "我的书院",
        tools: [
          { label: "我的订单", icon: "单", color: "#8B5A2B", link: "/pages/user/orders", action: "navigate" },
          { label: "我的课程", icon: "课", color: "#4A6B8A", link: "/pages/user/courses", action: "navigate" },
          { label: "服务中心", icon: "服", color: "#7A6858", link: "/pages/service/index", action: "navigate" },
          { label: "账号设置", icon: "设", color: "#B45309", link: "/pages/user/settings", action: "navigate" }
        ],
        demoScenario: SCENARIO
      },
      layout: {
        heroBackgroundColor: "linear-gradient(135deg, #FFF7EC 0%, #F5DDC2 52%, #E8B89D 100%)",
        heroTextColor: "#5B2F24",
        heroMutedTextColor: "rgba(91, 47, 36, 0.68)"
      }
    },
    {
      type: "inner_pages",
      title: "内页布局",
      subtitle: "统一控制活动、公告、服务中心、报名详情等页面",
      sortOrder: 110,
      config: {
        pages: [
          { key: "activity_list", title: "活动", subtitle: "筛选近期活动，快速找到适合参加的课程和线下活动。", showBottomNav: true },
          { key: "announcement_list", title: "公告中心", subtitle: "活动通知、报名提醒和现场须知都会集中展示在这里。", showBottomNav: true },
          { key: "service_center", title: "服务中心", subtitle: "付款、退款、发票和客服信息，都可以在这里快速找到。", showBottomNav: true },
          { key: "activity_detail", title: "活动详情", subtitle: "查看活动介绍、报名规则、服务说明和现场信息。", showBottomNav: false },
          { key: "activity_register", title: "报名确认", subtitle: "确认票种、优惠和报名信息，提交后可在我的活动查看进度。", showBottomNav: false },
          { key: "registration_detail", title: "报名详情", subtitle: "查看报名状态、订单、签到码和主办方服务信息。", showBottomNav: true },
          { key: "review_page", title: "评价活动", subtitle: "你的反馈会帮助主办方持续改进活动体验。", showBottomNav: true },
          { key: "login_page", title: "手机号登录", subtitle: "用于查看报名、订单、签到码和会员权益。", showBottomNav: false },
          { key: "partner_page", title: "城市合伙人", subtitle: "区域保护、代理运营和城市书院演示入口。", showBottomNav: true }
        ],
        demoScenario: SCENARIO
      },
      layout: {
        headerBackgroundColor: "#ffffff",
        headerTextColor: "#5B2F24",
        headerSubtitleColor: "#7A6858",
        stickyFilterBackground: "#FFF7EC",
        actionBarBackgroundColor: "#ffffff"
      }
    }
  ];
  for (const payload of payloads) {
    await api("/admin/homepage/sections?pageKey=home", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
  }
  reportStep("H5 首页装修已重置为演示版");
}

async function ensureAnnouncements(token) {
  const existing = pickList(await api("/admin/announcements", { headers: auth(token) }));
  const title = "【演示】七维书院运营闭环验收说明";
  const payload = {
    title,
    type: "operation",
    content: "本页面为 qiwai-showcase 演示商家，覆盖活动报名、余额支付、退款、签到、课程学习、动态评论审核等上线验收场景。",
    enabled: true,
    pinned: true
  };
  const row = existing.find((item) => item.title === title);
  if (row) await api(`/admin/announcements/${row.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) });
  else await api("/admin/announcements", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
  reportStep("演示公告已配置");
}

async function ensureActivities(token) {
  const existing = pickList(await api("/admin/activities?pageSize=200", { headers: auth(token) }));
  for (const [index, [title, price, category, description]] of activities.entries()) {
    const payload = activityPayload(title, price, category, description, index);
    const row = existing.find((item) => item.title === title);
    const activity = row
      ? await api(`/admin/activities/${row.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
      : await api("/admin/activities", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
    await ensureTicketType(token, activity.id, price);
  }
  reportStep("活动与票种已创建/更新", "6 个活动，覆盖免费和收费");
}

function activityPayload(title, price, category, description, index) {
  return {
    title,
    coverUrl: cover(index),
    description,
    notice: "请提前 10 分钟到场签到。本演示内容仅用于系统验收，不涉及算命、改运、预测等违规内容。",
    location: "七维书院演示空间",
    locationLatitude: 29.844 + index * 0.001,
    locationLongitude: 106.056 + index * 0.001,
    startTime: futureDate(5 + index, 14 + (index % 3)),
    endTime: futureDate(5 + index, 16 + (index % 3)),
    registrationDeadline: futureDate(4 + index, 22),
    capacity: 40,
    price,
    status: "open",
    featured: index < 3,
    requireReview: false,
    allowCancel: true,
    fields: [
      { label: "姓名", type: "text", required: true, sortOrder: 1, options: [] },
      { label: "手机号", type: "phone", required: true, sortOrder: 2, options: [] },
      { label: "微信号", type: "text", required: false, sortOrder: 3, options: [] },
      { label: "学习兴趣", type: "select", required: false, sortOrder: 4, options: [{ label: category, value: category }, { label: "其他", value: "其他" }] }
    ],
    hosts: [{ name: "七维演示讲师", title: category, avatarUrl: "", bio: "负责演示商家内容交付和用户服务。", sortOrder: 1 }],
    sections: [
      { type: "highlights", title: "适合人群", content: "适合希望体验书院活动、课程学习和线下服务闭环的用户。", imageUrl: cover(index + 1), sortOrder: 1 },
      { type: "agenda", title: "活动流程", content: "签到入场、主题讲解、互动体验、答疑交流、后续学习建议。", imageUrl: "", sortOrder: 2 },
      { type: "notice", title: "验收说明", content: `demoScenario:${SCENARIO}，用于验证免费/收费报名、余额支付、退款和签到核销。`, imageUrl: "", sortOrder: 3 }
    ]
  };
}

async function ensureTicketType(token, activityId, price) {
  const list = pickList(await api(`/admin/ticket-types?activityId=${activityId}`, { headers: auth(token) }));
  const payload = { activityId, name: price > 0 ? "演示标准票" : "免费体验票", price, capacity: 40, enabled: true };
  const existing = list.find((item) => item.name === payload.name);
  if (existing) await api(`/admin/ticket-types/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) });
  else await api("/admin/ticket-types", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function ensureCourses(token) {
  const existing = pickList(await api("/admin/courses?status=published", { headers: auth(token) }));
  for (const [index, [title, price, teacherName, tags]] of courses.entries()) {
    const payload = {
      title,
      description: `${title}用于演示课程列表、课程详情、下单、后台确认、已购课程和学习进度闭环。`,
      coverUrl: cover(index + 3),
      teacherName,
      teacherAvatar: "",
      price,
      originalPrice: price ? price + 100 : 0,
      rating: 4.8,
      reviewCount: 18 + index,
      hotCount: 200 + index * 50,
      status: "published",
      tags,
      sortOrder: index + 1
    };
    const row = existing.find((item) => item.title === title);
    const course = row
      ? await api(`/admin/courses/${row.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
      : await api("/admin/courses", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
    await ensureCourseContent(token, course.id);
  }
  reportStep("课程与章节课时已创建/更新", "4 门课程");
}

async function ensureCourseContent(token, courseId) {
  const chapters = pickList(await api(`/admin/courses/${courseId}/chapters`, { headers: auth(token) }));
  let chapter = chapters.find((item) => item.title === "第一章：演示学习闭环");
  if (!chapter) {
    chapter = await api("/admin/course-chapters", { method: "POST", headers: auth(token), body: JSON.stringify({ courseId, title: "第一章：演示学习闭环", sortOrder: 1 }) });
  }
  const lessons = pickList(await api(`/admin/course-chapters/${chapter.id}/lessons`, { headers: auth(token) }));
  const lessonPayloads = [
    { title: "课时 1：课程介绍与学习目标", duration: "08:00", isFree: true, content: "演示课时内容：了解课程目标和学习路径。" },
    { title: "课时 2：核心方法与练习", duration: "16:00", isFree: false, content: "演示课时内容：后台确认购买后可学习并写回进度。" }
  ];
  for (const payload of lessonPayloads) {
    const existing = lessons.find((item) => item.title === payload.title);
    const body = { ...payload, chapterId: chapter.id, videoUrl: "https://example.com/showcase-course.mp4" };
    if (existing) await api(`/admin/course-lessons/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(body) });
    else await api("/admin/course-lessons", { method: "POST", headers: auth(token), body: JSON.stringify(body) });
  }
}

async function ensureCommunity(token) {
  await api("/admin/checkin-tasks", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ date: todayDate(), title: "【演示】今日书院共修打卡", description: "完成 10 分钟阅读或书写，并记录今天的一个小收获。" })
  }).catch(() => null);

  const communityActivities = pickList(await api("/admin/community-activities", { headers: auth(token) }));
  const caTitle = "【演示】周末线下共修会";
  if (!communityActivities.some((item) => item.title === caTitle)) {
    await api("/admin/community-activities", {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify({ title: caTitle, description: "用于展示共修活动入口和运营内容。", startTime: futureDate(8, 9), location: "七维书院演示空间", coverUrl: cover(5), status: "published" })
    });
  }

  const existingPosts = pickList(await api("/admin/community-posts?limit=50", { headers: auth(token) }));
  for (const [index, content] of posts.entries()) {
    if (existingPosts.some((item) => item.content === content)) continue;
    await api("/admin/community-posts", {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify({ userId: 1, content, images: [cover(index)], likes: 5 + index * 3, comments: 0, visible: true })
    });
  }
  reportStep("共修、打卡和书院动态已创建/更新");
}

async function ensureMembersAndWallets(tenantAdminToken, platformToken, tenantId) {
  for (const user of demoUsers) {
    const profile = await api("/admin/members", {
      method: "POST",
      headers: auth(tenantAdminToken),
      body: JSON.stringify({ phone: user.phone, password: showcasePassword, nickname: user.nickname, remark: `demoScenario:${SCENARIO}` })
    });
    const userId = profile?.user?.id || profile?.id || profile?.profile?.user?.id;
    assert(userId, `${user.phone} 会员创建后无法识别用户ID`);
    if (["paid", "refund", "course"].includes(user.key)) {
      await api(`/admin/users/${userId}/wallet/adjust`, {
        method: "POST",
        headers: auth(platformToken),
        body: JSON.stringify({ tenantId, amount: 500, type: "recharge", remark: `demoScenario:${SCENARIO} 余额支付验收充值` })
      });
    }
  }
  const publicSetting = await api(`/public/settings/operation?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  assert(publicSetting.customerServiceWechat === "qiwai_showcase_service", "演示商家 public 设置未生效");
  reportStep("演示用户与余额已准备");
}

main().catch((error) => {
  console.error("\n线上演示商家 seed 失败：");
  console.error(error.message);
  process.exitCode = 1;
});
