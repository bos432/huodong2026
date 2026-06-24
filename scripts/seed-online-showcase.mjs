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
  loginUser,
  pickList,
  reportStep,
  tenantHeader,
  todayDate
} from "./online-showcase-lib.mjs";

const showcasePassword = env("SHOWCASE_PASSWORD");
const DEFAULT_ACTIVITY_CAPACITY = 40;
const ACTIVITY_CAPACITY_BUFFER = 120;

const permissions = [
  "dashboard.view",
  "analytics.view",
  "tenant.manage",
  "tenant_region.manage",
  "admin.manage",
  "activity.manage",
  "activity.view",
  "category.manage",
  "ticket.manage",
  "coupon.manage",
  "registration.manage",
  "registration.view",
  "registration.export",
  "waitlist.manage",
  "order.manage",
  "order.view",
  "order.refund",
  "order.export",
  "finance.manage",
  "finance.view",
  "finance.export",
  "finance.wallet_adjust",
  "mall.merchant.manage",
  "mall.merchant.view",
  "mall.product.manage",
  "mall.product.audit",
  "mall.review.manage",
  "mall.logistics.manage",
  "mall.order.view",
  "mall.order.manage",
  "mall.refund.manage",
  "mall.finance.view",
  "mall.payment.manage",
  "mall.settlement.manage",
  "mall.statistics.view",
  "payment_account.view",
  "payment_account.manage",
  "agent_settlement.view",
  "agent_settlement.manage",
  "agent_settlement.pay",
  "agent_settlement.transfer",
  "agent_settlement.export",
  "member.manage",
  "member.view",
  "member.password",
  "member_level.manage",
  "tag.manage",
  "notification.manage",
  "review.manage",
  "homepage.manage",
  "announcement.manage",
  "operation_settings.manage",
  "tenant_profile.manage",
  "course.manage",
  "community.manage",
  "checkin.manage",
  "logs.view",
  "system.manage",
  "miniprogram_release.manage"
];

const accounts = [
  { username: "showcase_admin", role: "operator", permissions },
  { username: "showcase_ops", role: "operator", permissions: permissions.filter((item) => !item.startsWith("finance") && !item.startsWith("agent_settlement") && !item.startsWith("payment_account") && item !== "order.refund" && item !== "order.export") },
  { username: "showcase_finance", role: "finance", permissions: ["dashboard.view", "analytics.view", "activity.view", "registration.view", "order.view", "order.manage", "order.refund", "order.export", "finance.view", "finance.manage", "finance.export", "finance.wallet_adjust", "mall.merchant.manage", "mall.merchant.view", "mall.order.view", "mall.order.manage", "mall.refund.manage", "mall.finance.view", "mall.payment.manage", "mall.settlement.manage", "mall.statistics.view", "payment_account.view", "agent_settlement.view", "agent_settlement.manage", "agent_settlement.pay", "agent_settlement.transfer", "agent_settlement.export", "member.view", "upload.settlement_proof"] },
  { username: "showcase_checkin", role: "checkin_staff", permissions: ["dashboard.view", "activity.view", "registration.view", "checkin.manage"] }
];

const activities = [
  ["【演示】国学经典晨读体验营", 0, "国学", "清晨共读《大学》与《论语》片段，用 60 分钟体验慢π式学习节奏，适合第一次到访的新学员。"],
  ["【演示】硬笔书法入门公开课", 0, "书法", "从握笔、坐姿、基础笔画开始，现场完成一张入门作品，适合零基础成人和亲子家庭。"],
  ["【演示】节气养生与身心舒展", 0, "身心健康", "结合节气生活方式、呼吸放松和轻运动，做一场温和体验课，帮助用户建立健康打卡习惯。"],
  ["【演示】家庭教育沟通工作坊", 59, "家庭教育", "拆解亲子沟通场景，用练习帮助家长建立更稳定的表达方式，适合转化为系列课。"],
  ["【演示】东方美学书法半日课", 99, "书法", "半日沉浸式书法与东方美学体验，包含作品点评、茶歇交流和后续系统课推荐。"],
  ["【演示】个人成长与副业定位课", 199, "创业技能", "帮助学员梳理个人优势、服务定位和第一次成交路径，适合验证付费报名和交付闭环。"]
];

const courses = [
  ["【演示】国学入门十分钟", 0, "慢π导学老师", ["国学", "体验课", "新人必看"]],
  ["【演示】书法基础体验课", 0, "书法主理人", ["书法", "免费体验", "作品练习"]],
  ["【演示】传统文化系统课", 299, "慢π讲师团", ["传统文化", "系统课", "30天学习"]],
  ["【演示】家庭教育进阶课", 199, "家庭教育顾问", ["家庭教育", "进阶", "亲子沟通"]]
];

const posts = [
  "今日晨读摘记：把经典句子落回日常选择里，才是真正开始学习。新同学可以先从免费晨读体验营进入。",
  "书法体验课现场：横画不只是写直，更是在练稳定、呼吸和观察力。下周半日课会增加作品点评环节。",
  "家庭教育沙龙复盘：先处理情绪，再处理事情，是很多家长今天带走的一句话。评论区欢迎留下你的场景。",
  "节气身心课预告：这周从饮食、睡眠和轻运动三个角度做生活方式练习，适合加入共修打卡。",
  "学员笔记精选：学习传统文化不是背答案，而是多一个看世界的角度。今天的笔记已经整理进课程资料。",
  "慢π城市日常：下午的空间很安静，适合阅读、抄写，也适合和自己待一会儿。欢迎预约到店体验。",
  "共修打卡第 7 天：有人开始早睡，有人开始每天读 10 分钟书，小变化会积累，后台也能看到打卡记录。",
  "创业技能小课预告：用一页纸梳理用户、产品和第一次成交路径，适合想做本地文化服务的人。"
];

async function main() {
  console.log(`线上演示商家 seed target: ${API_BASE}`);
  const platform = await loginPlatformAdmin();
  const tenant = await ensureTenant(platform.token);
  await ensureTenantRegion(platform.token, tenant.id);
  await ensureAccounts(platform.token, tenant.id);
  const defaultMerchant = await ensureMallDefaultStore(platform.token, tenant.id);

  const showcaseAdmin = await loginShowcaseAdmin("showcase_admin");
  await ensureOperationSettings(showcaseAdmin.token);
  await ensureHomepage(showcaseAdmin.token);
  await ensureAnnouncements(showcaseAdmin.token, tenant.id);
  await ensureActivities(showcaseAdmin.token, tenant.id);
  await ensureCourses(showcaseAdmin.token, tenant.id);
  await ensureCommunity(showcaseAdmin.token, tenant.id);
  await ensureMall(showcaseAdmin.token, tenant.id, defaultMerchant.id);
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
    contactName: "慢π演示运营",
    contactPhone: "13990009999",
    enabled: true,
    settings: {
      demoScenario: SCENARIO,
      h5Domain: "rd.chaimen666.com",
      brandLogoUrl: cover(0),
      activityPublishReviewRequired: false,
      registrationReviewEnabled: false,
      paymentAccountEditable: true,
      mallEnabled: true
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
    body: JSON.stringify({ activityPublishReviewRequired: false, registrationReviewEnabled: false, paymentAccountEditable: true, mallEnabled: true })
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
  for (const account of accounts) {
    const payload = { username: account.username, password: showcasePassword, role: account.role, tenantId, permissions: account.permissions };
    const existing = await findAdminByUsername(token, account.username);
    if (existing) {
      await api(`/admin/admins/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify({ role: account.role, tenantId, enabled: true, permissions: account.permissions }) });
      await api(`/admin/admins/${existing.id}/password`, { method: "POST", headers: auth(token), body: JSON.stringify({ password: showcasePassword }) });
    } else {
      await api("/admin/admins", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
    }
  }
  reportStep("演示后台账号已创建/更新");
}

async function findAdminByUsername(token, username) {
  const result = pickList(await api(`/admin/admins?includeSmoke=true&pageSize=20&keyword=${encodeURIComponent(username)}`, { headers: auth(token) }));
  return result.find((item) => item.username === username) || null;
}

async function ensureMallDefaultStore(token, tenantId) {
  const merchants = pickList(await api(`/admin/mall/merchants?tenantId=${tenantId}`, { headers: auth(token) }));
  const payload = {
    tenantId,
    ownerType: "tenant",
    code: "qiwai-showcase-main",
    name: "慢π自营店",
    status: "active",
    mallEnabled: true,
    productAuditRequired: false,
    paymentMode: "platform_collect",
    region: "重庆市铜梁区",
    contactName: "慢π演示运营",
    contactPhone: "13990009999",
    notice: "慢π自营商品、课程周边和公益好物统一从这里发货。",
    remark: `demoScenario:${SCENARIO} default mall merchant`
  };
  const existing = merchants.find((item) => item.code === payload.code);
  let merchant = existing
    ? existing
    : await api("/admin/mall/merchants", { method: "POST", headers: auth(token), body: JSON.stringify({ ...payload, status: "disabled", mallEnabled: false }) });
  for (const username of ["showcase_admin", "showcase_ops", "showcase_finance"]) {
    const admin = await findAdminByUsername(token, username);
    if (!admin) continue;
    await api("/admin/mall/merchant-access", {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify({ adminId: admin.id, merchantId: merchant.id, accessRole: username.includes("finance") ? "finance" : "manager", enabled: true })
    });
  }
  const mutablePayload = existing
    ? {
        tenantId: payload.tenantId,
        name: payload.name,
        status: payload.status,
        mallEnabled: payload.mallEnabled,
        productAuditRequired: payload.productAuditRequired,
        paymentMode: payload.paymentMode,
        region: payload.region,
        contactName: payload.contactName,
        contactPhone: payload.contactPhone,
        notice: payload.notice,
        remark: payload.remark
      }
    : payload;
  merchant = await api(`/admin/mall/merchants/${merchant.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(mutablePayload) });
  reportStep("演示商城默认店铺与后台授权已配置", merchant.name);
  return merchant;
}

async function ensureOperationSettings(token) {
  await api("/admin/settings/operation", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({
      registrationEnabled: true,
      registrationDisabledMessage: "",
      offlinePaymentInstructions: "演示商家支持免费报名、余额支付和线下收款确认。真实微信/支付宝未配置时不能假成功。",
      paymentMethods: { free: true, balance: true, offline: true, wechat: true, alipay: false },
      customerServiceName: "慢π演示客服",
      customerServicePhone: "13990009999",
      customerServiceWechat: "qiwai_showcase_service",
      defaultGroupQrCodeUrl: "",
      refundInstructions: "演示退款用于验收余额退回、订单状态和财务记录。",
      invoiceInstructions: "演示订单如需发票，请联系演示客服登记开票信息。",
      pageTheme: {
        brandName: "慢π",
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
      title: "慢π演示中心",
      subtitle: "一座可运营的线上慢π空间：活动报名、课程学习、共修打卡、动态互动和财务追溯完整闭环。",
      sortOrder: 1,
      config: {
        eyebrow: "上线演示商家",
        backgroundImage: cover(4),
        backgroundColor: "linear-gradient(135deg, rgba(91,47,36,0.96), rgba(139,90,43,0.86))",
        primaryButtonText: "查看近期活动",
        primaryButtonLink: "/pages/activity/list",
        demoScenario: SCENARIO
      },
      layout: { highlighted: true, borderRadius: 18, spacingBottom: 18 }
    },
    {
      type: "announcement_bar",
      title: "运营公告",
      subtitle: "演示商家已准备活动、课程、动态、余额支付、退款与签到核销数据",
      sortOrder: 2,
      config: { limit: 3, pinnedFirst: true, link: "/pages/announcement/list", demoScenario: SCENARIO },
      layout: { spacingBottom: 14, backgroundColor: "#FFF7EC", borderRadius: 14 }
    },
    {
      type: "quick_nav",
      title: "慢π服务",
      subtitle: "从体验、学习到复购服务，用户路径一眼可见",
      sortOrder: 3,
      config: {
        items: [
          { label: "品牌故事", icon: "品", color: "#8B5A2B", link: "/pages/brand/story" },
          { label: "院长招募", icon: "院", color: "#7A4B24", link: "/pages/recruit/dean" },
          { label: "大使申请", icon: "使", color: "#C43D3D", link: "/pages/apply/ambassador" },
          { label: "帮扶申请", icon: "扶", color: "#5B8C5A", link: "/pages/apply/aid" },
          { label: "活动报名", icon: "活", color: "#8B5A2B", link: "/pages/activity/list", action: "mainPage" },
          { label: "课程学习", icon: "课", color: "#4A6B8A", link: "/pages/courses/index", action: "mainPage" },
          { label: "共修打卡", icon: "修", color: "#5B8C5A", link: "/pages/community/checkin" },
          { label: "慢π动态", icon: "动", color: "#B45309", link: "/pages/community/index", action: "mainPage" }
        ],
        demoScenario: SCENARIO
      },
      layout: { columns: 4, spacingBottom: 18 }
    },
    { type: "featured_activities", title: "近期精选活动", subtitle: "免费体验课负责获客，收费工作坊负责转化", sortOrder: 4, config: { source: "featured", limit: 6, demoScenario: SCENARIO }, layout: { display: "horizontal", spacingBottom: 18, borderRadius: 16 } },
    { type: "activity_tabs", title: "按兴趣找活动", subtitle: "国学、书法、家庭教育、身心成长", sortOrder: 5, config: { includeHot: true, limit: 8, demoScenario: SCENARIO }, layout: { spacingBottom: 12 } },
    { type: "activity_feed", title: "全部演示活动", subtitle: "覆盖免费报名、收费报名、余额支付、退款和签到核销", sortOrder: 6, config: { source: "latest", limit: 10, pageSize: 4, pagination: "pager", demoScenario: SCENARIO }, layout: { display: "list", borderRadius: 16 } },
    { type: "image_banner", title: "课程学习专区", subtitle: "体验课与系统课同步展示", sortOrder: 7, config: { imageUrl: cover(8), link: "/pages/courses/index", demoScenario: SCENARIO }, layout: { spacingBottom: 14, backgroundColor: "#F7E7D0", borderRadius: 16 } },
    { type: "rich_text", title: "运营闭环看板", subtitle: "用户路径与后台动作已经打通", sortOrder: 8, config: { content: "用户侧：浏览首页 -> 报名活动 -> 余额支付 -> 申请退款 -> 学习课程 -> 互动评论\n后台侧：发布内容 -> 确认收款 -> 审核退款 -> 核销签到 -> 审核评论 -> 查看财务流水", link: "/pages/community/index", demoScenario: SCENARIO }, layout: { spacingBottom: 18, backgroundColor: "#FFFCF6", borderRadius: 16 } },
    {
      type: "bottom_nav",
      title: "底部导航",
      sortOrder: 99,
      config: {
        items: [
          { label: "慢π", icon: "π", activeIcon: "π", link: "/pages/index/index", action: "mainPage", color: "#8B5A2B" },
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
      title: "我的慢π",
      subtitle: "报名、订单、课程、钱包和管理入口",
      sortOrder: 100,
      config: {
        greeting: "我的慢π",
        tools: [
          { label: "我的订单", icon: "单", color: "#8B5A2B", link: "/pages/user/orders", action: "navigate" },
          { label: "商城订单", icon: "商", color: "#C2410C", link: "/pages/user/mall-orders", action: "navigate" },
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
          { key: "partner_page", title: "城市合伙人", subtitle: "区域保护、代理运营和慢π城市演示入口。", showBottomNav: true }
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

async function ensureAnnouncements(token, tenantId) {
  const existing = pickList(await api("/admin/announcements", { headers: auth(token) }));
  const title = "【演示】慢π运营闭环验收说明";
  const payload = {
    tenantId,
    title,
    type: "operation",
    content: "本页面为 qiwai-showcase 演示商家，覆盖活动报名、余额支付、退款、签到、课程学习、动态评论审核等上线验收场景。",
    enabled: true,
    pinned: true
  };
  const row = existing.find((item) => item.title === title);
  if (row) await api(`/admin/announcements/${row.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) });
  else await api("/admin/announcements", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
  for (const stale of existing.filter((item) => String(item.title || "").includes("七维"))) {
    await api(`/admin/announcements/${stale.id}`, {
      method: "PATCH",
      headers: auth(token),
      body: JSON.stringify({ tenantId, title: stale.title, type: stale.type || "operation", content: stale.content || "", enabled: false, pinned: false })
    });
  }
  reportStep("演示公告已配置");
}

async function ensureActivities(token, tenantId) {
  const existing = pickList(await api("/admin/activities?pageSize=200", { headers: auth(token) }));
  for (const [index, [title, price, category, description]] of activities.entries()) {
    const targetTitle = normalizeShowcaseTitle(title);
    const row = existing.find((item) => {
      const itemTitle = normalizeShowcaseTitle(item.title);
      return itemTitle && (itemTitle.includes(targetTitle) || targetTitle.includes(itemTitle));
    });
    const capacity = showcaseCapacity(row);
    const payload = { ...activityPayload(title, price, category, description, index, capacity), tenantId };
    const activity = row
      ? await api(`/admin/activities/${row.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
      : await api("/admin/activities", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
    await ensureTicketType(token, activity.id, price, capacity);
  }
  reportStep("活动与票种已创建/更新", "6 个活动，覆盖免费和收费");
}

function normalizeShowcaseTitle(value) {
  return String(value || "").replace(/[【】]/g, "").replace(/演示/g, "").replace(/演/g, "").replace(/\s+/g, "");
}

function showcaseCapacity(row) {
  const existingCapacity = Number(row?.capacity || 0);
  const registeredCount = Number(row?.registeredCount || 0);
  return Math.max(DEFAULT_ACTIVITY_CAPACITY, existingCapacity, registeredCount + ACTIVITY_CAPACITY_BUFFER);
}

function activityPayload(title, price, category, description, index, capacity = DEFAULT_ACTIVITY_CAPACITY) {
  return {
    title,
    coverUrl: cover(index),
    description,
    notice: "请提前 10 分钟到场签到。本演示内容仅用于系统验收，不涉及算命、改运、预测等违规内容。",
    location: "慢π演示空间",
    locationLatitude: 29.844 + index * 0.001,
    locationLongitude: 106.056 + index * 0.001,
    startTime: futureDate(5 + index, 14 + (index % 3)),
    endTime: futureDate(5 + index, 16 + (index % 3)),
    registrationDeadline: futureDate(4 + index, 22),
    capacity,
    price,
    status: "open",
    featured: index < 3,
    requireReview: false,
    allowCancel: true,
    fields: [
      { label: "姓名", type: "text", required: true, sortOrder: 1, options: [] },
      { label: "手机号", type: "phone", required: true, sortOrder: 2, options: [] },
      { label: "微信号", type: "text", required: false, sortOrder: 3, options: [] },
      { label: "学习兴趣", type: "single_choice", required: false, sortOrder: 4, options: [{ label: category, value: category }, { label: "其他", value: "其他" }] }
    ],
    hosts: [{ name: "慢π演示讲师", title: category, avatarUrl: "", bio: "负责演示商家内容交付和用户服务。", sortOrder: 1 }],
    sections: [
      { type: "highlights", title: "你会获得什么", content: `一次完整的${category}体验：现场讲解、互动练习、老师答疑，以及后续课程/共修建议。`, imageUrl: cover(index + 1), sortOrder: 1 },
      { type: "agenda", title: "活动流程", content: "签到入场 -> 主题导入 -> 互动体验 -> 作品/问题点评 -> 后续学习建议。", imageUrl: "", sortOrder: 2 },
      { type: "notice", title: "服务保障", content: "报名后可在“我的”查看订单和签到码；收费报名支持余额支付演示，退款会进入后台审核并退回余额。", imageUrl: "", sortOrder: 3 }
    ]
  };
}

async function ensureTicketType(token, activityId, price, capacity = DEFAULT_ACTIVITY_CAPACITY) {
  const list = pickList(await api(`/admin/ticket-types?activityId=${activityId}`, { headers: auth(token) }));
  const payload = { activityId, name: price > 0 ? "演示标准票" : "免费体验票", price, capacity, enabled: true };
  const existing = list.find((item) => item.name === payload.name);
  if (existing) await api(`/admin/ticket-types/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) });
  else await api("/admin/ticket-types", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function ensureCourses(token, tenantId) {
  const existing = pickList(await api("/admin/courses?status=published", { headers: auth(token) }));
  for (const [index, [title, price, teacherName, tags]] of courses.entries()) {
    const payload = {
      tenantId,
      title,
      description: `${title}适合作为慢π线上课程样板：包含试看课时、系统课时、后台确认收款、已购课程和学习进度记录。`,
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
    { title: "课时 1：课程介绍与学习目标", duration: "08:00", isFree: true, content: "本节用于试看：了解课程目标、适合人群和学习路径。" },
    { title: "课时 2：核心方法与练习", duration: "16:00", isFree: false, content: "本节用于付费交付演示：后台确认购买后可学习，并写回学习进度。" }
  ];
  for (const payload of lessonPayloads) {
    const existing = lessons.find((item) => item.title === payload.title);
    const body = { ...payload, chapterId: chapter.id, videoUrl: "https://example.com/showcase-course.mp4" };
    if (existing) await api(`/admin/course-lessons/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(body) });
    else await api("/admin/course-lessons", { method: "POST", headers: auth(token), body: JSON.stringify(body) });
  }
}

async function ensureCommunity(token, tenantId) {
  const checkinPayload = { tenantId, date: todayDate(), title: "【演示】今日慢π共修打卡", description: "完成 10 分钟阅读或书写，并记录今天的一个小收获。" };
  const existingCheckins = pickList(await api(`/admin/checkin-tasks?date=${encodeURIComponent(checkinPayload.date)}`, { headers: auth(token) }));
  const tenantCheckins = existingCheckins.filter((item) => Number(item.tenant?.id || item.tenantId || tenantId) === Number(tenantId));
  if (tenantCheckins.length) {
    for (const item of tenantCheckins) {
      await api(`/admin/checkin-tasks/${item.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(checkinPayload) });
    }
  } else {
    await api("/admin/checkin-tasks", { method: "POST", headers: auth(token), body: JSON.stringify(checkinPayload) });
  }

  const communityActivities = pickList(await api("/admin/community-activities", { headers: auth(token) }));
  const caTitle = "【演示】周末线下共修会";
  const communityActivityPayload = {
    tenantId,
    title: caTitle,
    description: "用于展示共修活动入口和运营内容。",
    startTime: futureDate(8, 9),
    location: "慢π演示空间",
    coverUrl: cover(5),
    status: "published"
  };
  const existingCommunityActivity = communityActivities.find((item) => item.title === caTitle);
  if (existingCommunityActivity) {
    await api(`/admin/community-activities/${existingCommunityActivity.id}`, {
      method: "PATCH",
      headers: auth(token),
      body: JSON.stringify(communityActivityPayload)
    });
  } else {
    await api("/admin/community-activities", {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify(communityActivityPayload)
    });
  }

  const existingPosts = pickList(await api("/admin/community-posts?limit=50", { headers: auth(token) }));
  for (const [index, content] of posts.entries()) {
    if (existingPosts.some((item) => item.content === content)) continue;
    await api("/admin/community-posts", {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify({ tenantId, userId: 1, content, images: [cover(index)], likes: 5 + index * 3, comments: 0, visible: true })
    });
  }
  reportStep("共修、打卡和慢π动态已创建/更新");
}

async function ensureMall(token, tenantId, merchantId) {
  assert(merchantId, "演示商城 seed 缺少默认店铺 merchantId");
  const merchantQuery = `merchantId=${merchantId}`;
  const categoryNames = ["慢π文创", "学习用品", "公益好物"];
  const existingCategories = pickList(await api(`/admin/mall/categories?${merchantQuery}`, { headers: auth(token) }));
  const categories = [];
  for (const [index, name] of categoryNames.entries()) {
    const payload = { tenantId, merchantId, name, sortOrder: index + 1, enabled: true };
    const row = existingCategories.find((item) => item.name === name);
    const saved = row
      ? await api(`/admin/mall/categories/${row.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
      : await api("/admin/mall/categories", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
    categories.push(saved);
  }
  const existing = pickList(await api(`/admin/mall/products?pageSize=200&${merchantQuery}`, { headers: auth(token) }));
  const products = [
    ["【演示】慢π读书手账", "学习用品", 39, 69, "适合晨读、课程笔记和共修打卡记录，演示商城余额支付与线下收款。"],
    ["【演示】东方美学书签套装", "慢π文创", 19, 39, "铜版纸书签 6 枚装，适合作为活动伴手礼和课程赠品。"],
    ["【演示】节气香囊公益礼盒", "公益好物", 59, 99, "用于公益好物演示，售后、发货、库存流水均可追踪。"],
    ["【演示】书法入门练习套装", "学习用品", 89, 129, "含练习纸、基础字帖和控笔练习说明，适合书法体验课转化。"]
  ];
  for (const [index, [title, categoryName, price, originalPrice, description]] of products.entries()) {
    const category = categories.find((item) => item.name === categoryName);
    const payload = {
      categoryId: category?.id,
      tenantId,
      merchantId,
      title,
      coverUrl: cover(index + 10),
      description,
      price,
      originalPrice,
      status: "published",
      featured: index < 2,
      sortOrder: index + 1,
      deliveryNote: "默认 48 小时内发货，偏远地区请联系客服。",
      afterSaleNote: "未发货可申请退款；已发货如需退货退款请先联系运营方确认。",
      skus: [
        { name: "标准款", price, originalPrice, stock: 120, enabled: true },
        { name: "礼盒款", price: price + 20, originalPrice: originalPrice + 30, stock: 60, enabled: true }
      ]
    };
    const row = existing.find((item) => item.title === title);
    if (row) await api(`/admin/mall/products/${row.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify({ ...payload, skus: payload.skus.map((sku, skuIndex) => ({ ...sku, id: row.skus?.[skuIndex]?.id })) }) });
    else await api("/admin/mall/products", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
  }
  const seededProducts = pickList(await api(`/admin/mall/products?pageSize=200&${merchantQuery}`, { headers: auth(token) }));
  const stationeryCategory = categories.find((item) => item.name === "学习用品");
  const calligraphyProduct = seededProducts.find((item) => item.title === "【演示】书法入门练习套装");
  const couponPayload = { tenantId, merchantId, code: "SHOWCASE10", name: "演示商城满 50 减 10", minAmount: 50, discountAmount: 10, scope: "all", usageLimit: 0, enabled: true, startsAt: "2026-01-01 00:00:00", endsAt: "2027-12-31 23:59:59" };
  const couponPayloads = [
    couponPayload,
    { tenantId, merchantId, code: "STUDY8", name: "学习用品满 80 减 8", minAmount: 80, discountAmount: 8, scope: "category", scopeCategoryId: stationeryCategory?.id, usageLimit: 0, enabled: true, startsAt: "2026-01-01 00:00:00", endsAt: "2027-12-31 23:59:59" },
    { tenantId, merchantId, code: "CALLIGRAPHY12", name: "书法套装专享满 80 减 12", minAmount: 80, discountAmount: 12, scope: "product", scopeProductId: calligraphyProduct?.id, usageLimit: 0, perUserLimit: 0, enabled: true, startsAt: "2026-01-01 00:00:00", endsAt: "2027-12-31 23:59:59" },
    { tenantId, merchantId, code: "ONCE5", name: "新人每人限用满 50 减 5", minAmount: 50, discountAmount: 5, scope: "all", usageLimit: 0, perUserLimit: 1, enabled: true, startsAt: "2026-01-01 00:00:00", endsAt: "2027-12-31 23:59:59" }
  ];
  const existingCoupons = pickList(await api(`/admin/mall/coupons?pageSize=200&${merchantQuery}`, { headers: auth(token) }));
  for (const payload of couponPayloads) {
    if ((payload.scope === "category" && !payload.scopeCategoryId) || (payload.scope === "product" && !payload.scopeProductId)) continue;
    const coupon = existingCoupons.find((item) => item.code === payload.code);
    if (coupon) await api(`/admin/mall/coupons/${coupon.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) });
    else await api("/admin/mall/coupons", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
  }
  const promotionPayload = { tenantId, merchantId, code: "SHOWMALL5", name: "演示商城推广码 5%", commissionRate: 0.05, enabled: true, remark: `demoScenario:${SCENARIO} 商城推广佣金验收` };
  const existingPromotions = pickList(await api(`/admin/mall/promotion-codes?pageSize=200&${merchantQuery}`, { headers: auth(token) }));
  const promotion = existingPromotions.find((item) => item.code === promotionPayload.code);
  if (promotion) await api(`/admin/mall/promotion-codes/${promotion.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(promotionPayload) });
  else await api("/admin/mall/promotion-codes", { method: "POST", headers: auth(token), body: JSON.stringify(promotionPayload) });
  if (calligraphyProduct?.skus?.[0]?.id) {
    const sku = calligraphyProduct.skus[0];
    const existingFlashSales = pickList(await api(`/admin/mall/flash-sales?pageSize=200&${merchantQuery}`, { headers: auth(token) }));
    const existingFlashSale = existingFlashSales.find((item) => item.title === "【演示】书法套装限时秒杀");
    const flashSaleRemaining = Math.min(Math.max(Number(sku.stock || 0) - Number(sku.lockedStock || 0), 0), 120);
    const flashSalePayload = {
      productId: calligraphyProduct.id,
      tenantId,
      merchantId,
      skuId: sku.id,
      title: "【演示】书法套装限时秒杀",
      salePrice: 69,
      saleStock: Number(existingFlashSale?.soldStock || 0) + Number(existingFlashSale?.lockedStock || 0) + flashSaleRemaining,
      perUserLimit: 1,
      startsAt: "2026-01-01 00:00:00",
      endsAt: "2027-12-31 23:59:59",
      status: "active",
      sortOrder: 1
    };
    const flashSale = existingFlashSale;
    if (flashSale) await api(`/admin/mall/flash-sales/${flashSale.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(flashSalePayload) });
    else await api("/admin/mall/flash-sales", { method: "POST", headers: auth(token), body: JSON.stringify(flashSalePayload) });
  }
  if (calligraphyProduct?.skus?.[0]?.id) {
    const sku = calligraphyProduct.skus[1] || calligraphyProduct.skus[0];
    const existingGroupBuys = pickList(await api(`/admin/mall/group-buys?pageSize=200&${merchantQuery}`, { headers: auth(token) }));
    const existingGroupBuy = existingGroupBuys.find((item) => item.title === "【演示】书法套装二人成团");
    const groupBuyRemaining = Math.min(Math.max(Number(sku.stock || 0) - Number(sku.lockedStock || 0), 0), 60);
    const groupBuyPayload = {
      productId: calligraphyProduct.id,
      tenantId,
      merchantId,
      skuId: sku.id,
      title: "【演示】书法套装二人成团",
      groupPrice: 79,
      minPeople: 2,
      groupStock: Number(existingGroupBuy?.soldStock || 0) + Number(existingGroupBuy?.lockedStock || 0) + groupBuyRemaining,
      perUserLimit: 1,
      startsAt: "2026-01-01 00:00:00",
      endsAt: "2027-12-31 23:59:59",
      status: "active",
      sortOrder: 2
    };
    const groupBuy = existingGroupBuy;
    if (groupBuy) await api(`/admin/mall/group-buys/${groupBuy.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(groupBuyPayload) });
    else await api("/admin/mall/group-buys", { method: "POST", headers: auth(token), body: JSON.stringify(groupBuyPayload) });
  }
  const logisticsPayloads = [
    { tenantId, merchantId, name: "顺丰演示", code: "SF", servicePhone: "95338", trackingUrl: "https://www.sf-express.com/chn/sc/waybill/waybill-detail/", sortOrder: 1, enabled: true },
    { tenantId, merchantId, name: "中通演示", code: "ZTO", servicePhone: "95311", trackingUrl: "https://www.zto.com/express/expressCheck.html", sortOrder: 2, enabled: true },
    { tenantId, merchantId, name: "京东演示", code: "JD", servicePhone: "950616", trackingUrl: "https://www.jdl.com/orderSearch/", sortOrder: 3, enabled: true }
  ];
  const existingLogistics = pickList(await api(`/admin/mall/logistics-companies?pageSize=200&${merchantQuery}`, { headers: auth(token) }));
  for (const payload of logisticsPayloads) {
    const row = existingLogistics.find((item) => item.name === payload.name);
    if (row) await api(`/admin/mall/logistics-companies/${row.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) });
    else await api("/admin/mall/logistics-companies", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
  }
  reportStep("商城分类、商品、优惠券、推广码、秒杀、拼团与物流设置已创建/更新", "4 个商品，含全场/分类/指定商品券，1 个推广码，1 个秒杀活动，1 个拼团活动，3 个物流公司，覆盖 SKU、库存、余额/线下支付");
}

async function ensureMembersAndWallets(tenantAdminToken, platformToken, tenantId) {
  for (const user of demoUsers) {
    const profile = await api("/admin/members", {
      method: "POST",
      headers: auth(tenantAdminToken),
      body: JSON.stringify({ phone: user.phone, password: showcasePassword, nickname: user.nickname, remark: `demoScenario:${SCENARIO}` })
    });
    const loggedIn = await loginUser(user.phone, user.nickname);
    const userId = loggedIn.user?.id;
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
