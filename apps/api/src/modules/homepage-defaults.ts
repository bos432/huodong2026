export interface HomepageSectionTemplate {
  pageKey: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  enabled: boolean;
  sortOrder: number;
  config: Record<string, unknown>;
  layout: Record<string, unknown>;
}

export const HOMEPAGE_SECTION_TYPES = [
  "search_bar",
  "hero",
  "announcement_bar",
  "quick_nav",
  "category_grid",
  "featured_activities",
  "activity_tabs",
  "activity_feed",
  "testimonial_feed",
  "featured_testimonials",
  "activity_testimonials",
  "charity_summary",
  "course_recommendations",
  "mall_showcase",
  "brand_story_entry",
  "image_banner",
  "rich_text",
  "bottom_nav",
  "my_page",
  "inner_pages"
] as const;

export const H5_PAGE_KEYS = [
  "home",
  "activity_list",
  "activity_detail",
  "activity_register",
  "announcement_list",
  "service_center",
  "partner_page",
  "user_my",
  "login_page",
  "registration_detail",
  "review_page",
  "community_home",
  "community_detail",
  "course_home",
  "charity_page",
  "mall_home",
  "brand_story"
] as const;

export const H5_PAGE_LABELS: Record<string, string> = {
  home: "首页",
  activity_list: "活动列表",
  activity_detail: "活动详情",
  activity_register: "报名确认",
  announcement_list: "公告中心",
  service_center: "服务中心",
  partner_page: "城市合伙人",
  user_my: "我的",
  login_page: "登录",
  registration_detail: "报名详情",
  review_page: "评价",
  community_home: "共修首页",
  community_detail: "动态详情",
  course_home: "课程首页",
  charity_page: "公益页",
  mall_home: "商城首页",
  brand_story: "品牌故事"
};

const bottomNav = {
  items: [
    { label: "慢π", icon: "π", activeIcon: "π", link: "/pages/index/index", action: "mainPage", color: "#C43D3D" },
    { label: "课程", icon: "课", activeIcon: "课", link: "/pages/courses/index", action: "mainPage", color: "#C43D3D" },
    { label: "共修", icon: "修", activeIcon: "修", link: "/pages/community/index", action: "mainPage", color: "#C43D3D" },
    { label: "活动", icon: "活", activeIcon: "活", link: "/pages/activity/list", action: "mainPage", color: "#C43D3D" },
    { label: "我的", icon: "我", activeIcon: "我", link: "/pages/user/my", action: "mainPage", color: "#C43D3D" }
  ]
};

export function normalizePageKey(value?: string | null) {
  const key = String(value || "home").trim();
  return H5_PAGE_KEYS.includes(key as any) ? key : "home";
}

export function defaultHomepageSections(pageKey = "home"): HomepageSectionTemplate[] {
  return defaultPageSections(pageKey);
}

export function defaultPageSections(pageKey = "home"): HomepageSectionTemplate[] {
  const key = normalizePageKey(pageKey);
  if (key !== "home") return defaultInnerPageSections(key);
  return [
    {
      pageKey: "home",
      type: "search_bar",
      title: null,
      subtitle: null,
      enabled: true,
      sortOrder: 10,
      config: { cityLabel: "本地", placeholder: "搜索沙龙、读书会、培训" },
      layout: { spacingBottom: 10, background: "transparent" }
    },
    {
      pageKey: "home",
      type: "hero",
      title: "发现值得参加的线下活动",
      subtitle: "沙龙、读书会、训练营和社群聚会，一站完成筛选、报名、付款确认和签到。",
      enabled: true,
      sortOrder: 20,
      config: {
        eyebrow: "慢π活动运营",
        primaryButtonText: "浏览活动",
        primaryButtonLink: "/pages/activity/list",
        showStats: true,
        backgroundColor: "#0f766e",
        backgroundImage: ""
      },
      layout: { spacingBottom: 10, density: "comfortable" }
    },
    {
      pageKey: "home",
      type: "announcement_bar",
      title: "公告",
      subtitle: null,
      enabled: true,
      sortOrder: 30,
      config: { limit: 5, pinnedFirst: true, link: "/pages/announcement/list" },
      layout: { spacingBottom: 10 }
    },
    {
      pageKey: "home",
      type: "quick_nav",
      title: null,
      subtitle: null,
      enabled: true,
      sortOrder: 40,
      config: {
        items: [
          { label: "品牌故事", icon: "品", color: "#8B5A2B", link: "/pages/brand/story" },
          { label: "院长招募", icon: "院", color: "#7A4B24", link: "/pages/recruit/dean" },
          { label: "大使申请", icon: "使", color: "#C43D3D", link: "/pages/apply/ambassador" },
          { label: "帮扶申请", icon: "扶", color: "#5B8C5A", link: "/pages/apply/aid" },
          { label: "全部活动", icon: "activity", color: "#0f766e", link: "/pages/activity/list" },
          { label: "公告中心", icon: "notice", color: "#c2410c", link: "/pages/announcement/list" },
          { label: "我的报名", icon: "ticket", color: "#4338ca", link: "/pages/user/my", action: "mainPage" },
          { label: "服务中心", icon: "service", color: "#475467", link: "/pages/service/index" }
        ]
      },
      layout: { columns: 4, spacingBottom: 18 }
    },
    {
      pageKey: "home",
      type: "category_grid",
      title: "活动社区",
      subtitle: "按兴趣快速进入活动池",
      enabled: true,
      sortOrder: 50,
      config: { limit: 8, showCover: true },
      layout: { display: "horizontal", spacingBottom: 18 }
    },
    {
      pageKey: "home",
      type: "featured_activities",
      title: "精选活动",
      subtitle: "主办方推荐，适合优先查看",
      enabled: true,
      sortOrder: 60,
      config: { source: "featured", limit: 6 },
      layout: { display: "horizontal", spacingBottom: 18 }
    },
    {
      pageKey: "home",
      type: "activity_tabs",
      title: null,
      subtitle: null,
      enabled: true,
      sortOrder: 70,
      config: { includeHot: true, limit: 8 },
      layout: { spacingBottom: 8 }
    },
    {
      pageKey: "home",
      type: "activity_feed",
      title: null,
      subtitle: null,
      enabled: true,
      sortOrder: 80,
      config: { source: "latest", limit: 10, pageSize: 4, pagination: "pager" },
      layout: { display: "list" }
    },
    {
      pageKey: "home",
      type: "testimonial_feed",
      title: "参与者心得",
      subtitle: "看看同学们参加活动后的真实感受",
      enabled: true,
      sortOrder: 85,
      config: { source: "participant", limit: 3, link: "/pages/community/index" },
      layout: { display: "cards", spacingBottom: 18 }
    },
    {
      pageKey: "home",
      type: "brand_story_entry",
      title: "慢π在做什么",
      subtitle: "用活动、课程和公益共建一座城市里的东方文化学习场。",
      enabled: true,
      sortOrder: 86,
      config: { buttonText: "了解品牌故事", link: "/pages/brand/story", imageUrl: "" },
      layout: { spacingBottom: 18, backgroundColor: "#fff7ec" }
    },
    {
      pageKey: "home",
      type: "bottom_nav",
      title: "前台底部导航",
      subtitle: null,
      enabled: true,
      sortOrder: 90,
      config: bottomNav,
      layout: { backgroundColor: "#ffffff", activeColor: "#0f766e", textColor: "#667085" }
    },
    {
      pageKey: "home",
      type: "my_page",
      title: "我的活动",
      subtitle: "报名、付款、审核、签到状态都在这里",
      enabled: true,
      sortOrder: 100,
      config: {
        greeting: "我的活动",
        tools: [
          { label: "浏览活动", icon: "活", color: "#0f766e", link: "/pages/activity/list", action: "mainPage" },
          { label: "公告中心", icon: "告", color: "#c2410c", link: "/pages/announcement/list" },
          { label: "服务中心", icon: "服", color: "#475467", link: "/pages/service/index" },
          { label: "我的订单", icon: "单", color: "#4338ca", link: "/pages/user/orders", action: "navigate" }
        ]
      },
      layout: {
        heroBackgroundColor: "linear-gradient(135deg, #FFF7EC 0%, #F5DDC2 52%, #E8B89D 100%)",
        heroTextColor: "#5B2F24",
        heroMutedTextColor: "rgba(91, 47, 36, 0.68)"
      }
    },
    {
      pageKey: "home",
      type: "inner_pages",
      title: "内页布局",
      subtitle: "统一控制活动列表、公告中心、服务中心和活动详情的标题与底部导航",
      enabled: true,
      sortOrder: 110,
      config: {
        pages: [
          { key: "activity_list", title: "活动", subtitle: "筛选近期活动，快速找到适合参加的课程和线下活动。", showBottomNav: true },
          { key: "announcement_list", title: "公告中心", subtitle: "活动通知、报名提醒和现场须知都会集中展示在这里。", showBottomNav: true },
          { key: "service_center", title: "服务中心", subtitle: "付款、退款、发票和客服信息，都可以在这里快速找到。", showBottomNav: true },
          { key: "activity_detail", title: "活动详情", subtitle: "查看活动介绍、报名规则、服务说明和现场信息。", showBottomNav: false },
          { key: "activity_register", title: "报名确认", subtitle: "确认票种、优惠和报名信息，提交后可在我的活动查看进度。", showBottomNav: false },
          { key: "registration_detail", title: "报名详情", subtitle: "查看报名状态、订单、签到码、入群二维码和主办方服务信息。", showBottomNav: true },
          { key: "review_page", title: "评价活动", subtitle: "你的反馈会帮助主办方持续改进活动体验。", showBottomNav: true },
          { key: "login_page", title: "手机号登录", subtitle: "用于查看报名、订单、签到码和会员权益。", showBottomNav: false },
          { key: "partner_page", title: "城市合伙人", subtitle: "适合文化空间、书院、培训机构和本地社群运营者，用 SaaS 后台独立发布活动、收款对账和沉淀会员。", showBottomNav: true },
          { key: "community_home", title: "共修", subtitle: "活动心得、打卡任务和同学动态集中展示。", showBottomNav: true },
          { key: "community_detail", title: "动态详情", subtitle: "查看参与者心得、图片、评论与分享海报。", showBottomNav: false },
          { key: "course_home", title: "全部课程", subtitle: "系统学习东方文化与活动方法。", showBottomNav: true },
          { key: "charity_page", title: "公益池", subtitle: "公开展示公益金、公示项目和执行动态。", showBottomNav: true },
          { key: "mall_home", title: "慢π商城", subtitle: "精选文化好物、课程周边与城市店铺。", showBottomNav: true },
          { key: "brand_story", title: "品牌故事", subtitle: "讲清慢π的理念、路径与共建方式。", showBottomNav: true }
        ]
      },
      layout: {
        headerBackgroundColor: "#ffffff",
        headerTextColor: "#111827",
        headerSubtitleColor: "#667085",
        stickyFilterBackground: "#f4f6f8",
        actionBarBackgroundColor: "#ffffff"
      }
    }
  ];
}

function defaultInnerPageSections(pageKey: string): HomepageSectionTemplate[] {
  const label = H5_PAGE_LABELS[pageKey] || "页面";
  const hideNav = ["activity_detail", "activity_register", "login_page", "community_detail"].includes(pageKey);
  const subtitleMap: Record<string, string> = {
    activity_list: "筛选近期活动，快速找到适合参加的课程和线下活动。",
    activity_detail: "查看活动介绍、报名规则、服务说明和现场信息。",
    activity_register: "确认票种、优惠和报名信息，提交后可在我的活动查看进度。",
    announcement_list: "活动通知、报名提醒和现场须知都会集中展示在这里。",
    service_center: "付款、退款、发票和客服信息，都可以在这里快速找到。",
    partner_page: "适合文化空间、书院、培训机构和本地社群运营者。",
    user_my: "报名、付款、审核、签到状态都在这里。",
    login_page: "用于查看报名、订单、签到码和会员权益。",
    registration_detail: "查看报名状态、订单、签到码、入群二维码和主办方服务信息。",
    review_page: "你的反馈会帮助主办方持续改进活动体验。",
    community_home: "活动心得、打卡任务和同学动态集中展示。",
    community_detail: "查看参与者心得、图片、评论与分享海报。",
    course_home: "系统学习东方文化与活动方法。",
    charity_page: "公开展示公益金、公示项目和执行动态。",
    mall_home: "精选文化好物、课程周边与城市店铺。",
    brand_story: "讲清慢π的理念、路径与共建方式。"
  };
  const sections: HomepageSectionTemplate[] = [
    ...(pageKey === "user_my" ? [{
      pageKey,
      type: "my_page",
      title: "我的",
      subtitle: "会员权益、订单、课程和管理入口",
      enabled: true,
      sortOrder: 5,
      config: {
        greeting: "我的",
        tools: [
          { label: "我的订单", icon: "单", color: "#c43d3d", link: "/pages/user/orders", action: "navigate" },
          { label: "我的课程", icon: "课", color: "#4a6b8a", link: "/pages/user/courses", action: "navigate" },
          { label: "服务中心", icon: "服", color: "#475467", link: "/pages/service/index", action: "navigate" },
          { label: "账号设置", icon: "设", color: "#7c3aed", link: "/pages/user/settings", action: "navigate" }
        ]
      },
      layout: {
        heroBackgroundColor: "linear-gradient(135deg, #FFF7EC 0%, #F5DDC2 52%, #E8B89D 100%)",
        heroTextColor: "#5B2F24",
        heroMutedTextColor: "rgba(91, 47, 36, 0.68)"
      }
    }] : []),
    {
      pageKey,
      type: "hero",
      title: label,
      subtitle: subtitleMap[pageKey] || "",
      enabled: true,
      sortOrder: 10,
      config: { eyebrow: "慢π", showStats: false, primaryButtonText: "", primaryButtonLink: "", backgroundColor: "#0f766e", backgroundImage: "" },
      layout: { spacingBottom: 16, density: "compact", borderRadius: 8 }
    },
    {
      pageKey,
      type: "rich_text",
      title: "页面说明",
      subtitle: null,
      enabled: true,
      sortOrder: 20,
      config: { content: subtitleMap[pageKey] || "", imageUrl: "", link: "" },
      layout: { spacingBottom: 18 }
    }
  ];
  if (!hideNav) {
    sections.push({
      pageKey,
      type: "bottom_nav",
      title: "前台底部导航",
      subtitle: null,
      enabled: true,
      sortOrder: 90,
      config: bottomNav,
      layout: { backgroundColor: "#ffffff", activeColor: "#0f766e", textColor: "#667085" }
    });
  }
  return sections;
}

export function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
