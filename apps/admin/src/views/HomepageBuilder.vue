<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { CopyDocument, Delete, Plus, QuestionFilled, Refresh, Upload, View } from "@element-plus/icons-vue";
import { api } from "../api";
import { currentTenantCode, isPlatformAdmin } from "../permissions";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";
import type { HomepageSectionView, HomepageSectionType } from "@activity/shared";

type SectionForm = {
  type: HomepageSectionType | string;
  title: string;
  subtitle: string;
  enabled: boolean;
  sortOrder: number;
  config: Record<string, any>;
  layout: Record<string, any>;
};

type CrossCopyMode = "current_page" | "all_pages";
type LinkPickerTarget =
  | { kind: "config"; key: string; label: string }
  | { kind: "array"; arrayKey: "items" | "tools"; index: number; key: string; label: string };
type HealthIssue = { level: "error" | "warning"; title: string; detail: string; sectionId?: number };
type DecorationVersion = {
  id: number;
  pageKey: string;
  name?: string | null;
  note?: string | null;
  sectionCount: number;
  createdByName?: string | null;
  createdAt: string;
  tenant?: { id: number; name?: string | null; code?: string | null } | null;
};
type DecorationTemplate = {
  id: number;
  pageKey: string;
  name: string;
  category?: string | null;
  description?: string | null;
  sectionCount: number;
  createdByName?: string | null;
  updatedAt: string;
  createdAt: string;
  tenant?: { id: number; name?: string | null; code?: string | null } | null;
};

const moduleTypes: Array<{ type: HomepageSectionType; label: string; description: string }> = [
  { type: "search_bar", label: "搜索栏", description: "城市与搜索入口" },
  { type: "hero", label: "主视觉", description: "首屏标题、按钮和统计" },
  { type: "announcement_bar", label: "公告栏", description: "滚动展示公告" },
  { type: "quick_nav", label: "快捷入口", description: "常用功能入口" },
  { type: "category_grid", label: "活动分类", description: "分类横向卡片" },
  { type: "featured_activities", label: "精选活动", description: "推荐活动横滑" },
  { type: "activity_tabs", label: "分类标签", description: "活动流筛选标签" },
  { type: "activity_feed", label: "活动信息流", description: "活动列表" },
  { type: "testimonial_feed", label: "参与者心得", description: "展示审核通过的用户心得" },
  { type: "featured_testimonials", label: "精选心得", description: "突出学员案例和活动口碑" },
  { type: "activity_testimonials", label: "活动口碑墙", description: "适合活动详情页展示反馈" },
  { type: "charity_summary", label: "公益公示摘要", description: "公益池、公示项目入口" },
  { type: "course_recommendations", label: "课程推荐", description: "课程转化入口" },
  { type: "mall_showcase", label: "商城精选", description: "文化好物导购入口" },
  { type: "brand_story_entry", label: "品牌故事入口", description: "品牌理念与共建入口" },
  { type: "image_banner", label: "图片广告", description: "运营 Banner" },
  { type: "rich_text", label: "富文本", description: "报名须知与说明" },
  { type: "bottom_nav", label: "前台底部导航", description: "控制前台底部 5 个菜单、图标和跳转" },
  { type: "my_page", label: "我的页", description: "我的页面头部和快捷入口" },
  { type: "inner_pages", label: "内页布局", description: "活动、报名、招商等内页" }
];

const pageOptions = [
  { key: "home", label: "首页", route: "/pages/index/index" },
  { key: "activity_list", label: "活动列表", route: "/pages/activity/list" },
  { key: "activity_detail", label: "活动详情", route: "/pages/activity/detail" },
  { key: "activity_register", label: "报名确认", route: "/pages/activity/register" },
  { key: "announcement_list", label: "公告中心", route: "/pages/announcement/list" },
  { key: "service_center", label: "服务中心", route: "/pages/service/index" },
  { key: "partner_page", label: "城市合伙人", route: "/pages/partner/index" },
  { key: "user_my", label: "我的", route: "/pages/user/my" },
  { key: "login_page", label: "登录", route: "/pages/user/login" },
  { key: "registration_detail", label: "报名详情", route: "/pages/user/registration" },
  { key: "review_page", label: "评价", route: "/pages/user/review" },
  { key: "community_home", label: "共修首页", route: "/pages/community/index" },
  { key: "community_detail", label: "动态详情", route: "/pages/community/detail" },
  { key: "course_home", label: "课程首页", route: "/pages/courses/index" },
  { key: "charity_page", label: "公益页", route: "/pages/charity/index" },
  { key: "mall_home", label: "商城首页", route: "/pages/mall/index" },
  { key: "brand_story", label: "品牌故事", route: "/pages/brand/story" }
];

const defaultConfig: Record<string, Record<string, any>> = {
  search_bar: { cityLabel: "本地", placeholder: "搜索沙龙、读书会、培训" },
  hero: { eyebrow: "慢π活动运营", primaryButtonText: "浏览活动", primaryButtonLink: "/pages/activity/list", showStats: true, backgroundColor: "#0f766e", backgroundImage: "", backgroundFit: "cover", overlayColor: "#0f2327", overlayOpacity: 42, textOpacity: 100, titleOpacity: 100, subtitleOpacity: 86, buttonOpacity: 18, statsOpacity: 14 },
  announcement_bar: { limit: 5, pinnedFirst: true, link: "/pages/announcement/list" },
  quick_nav: {
    items: [
      { label: "全部活动", icon: "activity", color: "#0f766e", link: "/pages/activity/list" },
      { label: "公告中心", icon: "notice", color: "#c2410c", link: "/pages/announcement/list" },
      { label: "我的报名", icon: "ticket", color: "#4338ca", link: "/pages/user/my", action: "mainPage" },
      { label: "服务中心", icon: "service", color: "#475467", link: "/pages/service/index" }
    ]
  },
  category_grid: { limit: 8, showCover: true },
  featured_activities: { source: "featured", limit: 6 },
  activity_tabs: { includeHot: true, limit: 8 },
  activity_feed: { source: "latest", limit: 10, pageSize: 4, pagination: "pager" },
  testimonial_feed: { source: "participant", limit: 3, link: "/pages/community/index" },
  featured_testimonials: { source: "featured", limit: 3, link: "/pages/community/index" },
  activity_testimonials: { source: "activity", limit: 6, link: "/pages/community/index" },
  charity_summary: {
    link: "/pages/charity/index",
    items: [
      { label: "公益池", icon: "益" },
      { label: "项目公示", icon: "公" },
      { label: "志愿服务", icon: "愿" }
    ]
  },
  course_recommendations: {
    link: "/pages/courses/index",
    items: [
      { label: "系统课程", icon: "课" },
      { label: "学习记录", icon: "学" },
      { label: "证书成长", icon: "证" }
    ]
  },
  mall_showcase: {
    link: "/pages/mall/index",
    items: [
      { label: "文化好物", icon: "物" },
      { label: "店铺精选", icon: "店" },
      { label: "优惠活动", icon: "惠" }
    ]
  },
  brand_story_entry: { buttonText: "了解品牌故事", link: "/pages/brand/story", imageUrl: "" },
  image_banner: { imageUrl: "", link: "/pages/activity/list", ratio: "3:1", fit: "cover" },
  rich_text: { content: "报名须知", imageUrl: "", link: "" },
  bottom_nav: {
    items: [
      { label: "慢π", icon: "π", activeIcon: "π", link: "/pages/index/index", action: "mainPage", color: "#C43D3D", enabled: true },
      { label: "课程", icon: "课", activeIcon: "课", link: "/pages/courses/index", action: "mainPage", color: "#C43D3D", enabled: true },
      { label: "共修", icon: "修", activeIcon: "修", link: "/pages/community/index", action: "mainPage", color: "#C43D3D", enabled: true },
      { label: "活动", icon: "活", activeIcon: "活", link: "/pages/activity/list", action: "mainPage", color: "#C43D3D", enabled: true },
      { label: "我的", icon: "我", activeIcon: "我", link: "/pages/user/my", action: "mainPage", color: "#C43D3D", enabled: true }
    ]
  },
  my_page: {
    greeting: "我的活动",
    tools: [
      { label: "浏览活动", icon: "活", color: "#0f766e", link: "/pages/activity/list", action: "mainPage" },
      { label: "公告中心", icon: "告", color: "#c2410c", link: "/pages/announcement/list" },
      { label: "服务中心", icon: "服", color: "#475467", link: "/pages/service/index" },
      { label: "我的订单", icon: "单", color: "#4338ca", link: "/pages/user/orders", action: "navigate" }
    ]
  },
  inner_pages: {
    pages: [
      { key: "activity_list", title: "活动", subtitle: "筛选近期活动，快速找到适合参加的课程和线下活动。", showBottomNav: true },
      { key: "announcement_list", title: "公告中心", subtitle: "活动通知、报名提醒和现场须知都会集中展示在这里。", showBottomNav: true },
      { key: "service_center", title: "服务中心", subtitle: "付款、退款、发票和客服信息，都可以在这里快速找到。", showBottomNav: true },
      { key: "activity_detail", title: "活动详情", subtitle: "查看活动介绍、报名规则、服务说明和现场信息。", showBottomNav: false },
      { key: "activity_register", title: "报名确认", subtitle: "确认票种、优惠和报名信息，提交后可在我的活动查看进度。", showBottomNav: false },
      { key: "registration_detail", title: "报名详情", subtitle: "查看报名状态、订单、签到码、入群二维码和主办方服务信息。", showBottomNav: true },
      { key: "review_page", title: "评价活动", subtitle: "你的反馈会帮助主办方持续改进活动体验。", showBottomNav: true },
      { key: "login_page", title: "手机号登录", subtitle: "用于查看报名、订单、签到码和会员权益。", showBottomNav: false },
      { key: "partner_page", title: "城市合伙人", subtitle: "适合文化空间、书院、培训机构和本地社群运营者，用 SaaS 后台独立发布活动、收款对账和沉淀会员。", showBottomNav: true }
    ]
  }
};

const defaultLayout: Record<string, Record<string, any>> = {
  search_bar: { spacingBottom: 10, background: "transparent" },
  hero: { spacingBottom: 10, density: "comfortable", borderRadius: 8 },
  announcement_bar: { spacingBottom: 10 },
  quick_nav: { columns: 4, spacingBottom: 18 },
  category_grid: { display: "horizontal", spacingBottom: 18 },
  featured_activities: { display: "horizontal", spacingBottom: 18 },
  activity_tabs: { spacingBottom: 8 },
  activity_feed: { display: "list" },
  testimonial_feed: { display: "cards", spacingBottom: 18, backgroundColor: "#ffffff", borderRadius: 8 },
  featured_testimonials: { display: "cards", spacingBottom: 18, backgroundColor: "#fff7ec", borderRadius: 8 },
  activity_testimonials: { display: "wall", spacingBottom: 18, backgroundColor: "#ffffff", borderRadius: 8 },
  charity_summary: { spacingBottom: 18, backgroundColor: "#ffffff", borderRadius: 8 },
  course_recommendations: { spacingBottom: 18, backgroundColor: "#ffffff", borderRadius: 8 },
  mall_showcase: { spacingBottom: 18, backgroundColor: "#ffffff", borderRadius: 8 },
  brand_story_entry: { spacingBottom: 18, backgroundColor: "#fff7ec", borderRadius: 8 },
  image_banner: { spacingBottom: 18 },
  rich_text: { spacingBottom: 18 },
  bottom_nav: { backgroundColor: "#ffffff", activeColor: "#0f766e", textColor: "#667085" },
  my_page: {
    heroBackgroundColor: "linear-gradient(135deg, #FFF7EC 0%, #F5DDC2 52%, #E8B89D 100%)",
    heroTextColor: "#5B2F24",
    heroMutedTextColor: "rgba(91, 47, 36, 0.68)"
  },
  inner_pages: { headerBackgroundColor: "#ffffff", headerTextColor: "#111827", headerSubtitleColor: "#667085", stickyFilterBackground: "#f4f6f8", actionBarBackgroundColor: "#ffffff" }
};
type TemplateRow = { type: HomepageSectionType | string; title: string | null; subtitle?: string | null; config?: Record<string, any>; layout?: Record<string, any>; enabled?: boolean };
const decorationTemplates: Array<{ key: string; label: string; rows: TemplateRow[] }> = [
  {
    key: "activity_ops",
    label: "活动运营型",
    rows: [
      { type: "hero", title: "近期活动与共修报名", subtitle: "筛选近期线下活动，报名、付款确认和签到都在这里完成。", config: { ...defaultConfig.hero, primaryButtonText: "浏览活动", primaryButtonLink: "/pages/activity/list", backgroundColor: "#0f766e" } },
      { type: "quick_nav", title: null, config: defaultConfig.quick_nav },
      { type: "featured_activities", title: "精选活动", subtitle: "主办方推荐，适合优先查看" },
      { type: "testimonial_feed", title: "参与者心得", subtitle: "真实活动反馈帮助新用户理解这里在发生什么" }
    ]
  },
  {
    key: "academy_brand",
    label: "慢π品牌型",
    rows: [
      { type: "hero", title: "慢π", subtitle: "在城市里共建东方文化学习、活动和公益服务场。", config: { ...defaultConfig.hero, eyebrow: "东方文化共建", primaryButtonText: "了解品牌故事", primaryButtonLink: "/pages/brand/story", backgroundColor: "#5b2f24" } },
      { type: "brand_story_entry", title: "慢π在做什么", subtitle: "讲清理念、课程、活动和城市共建路径" },
      { type: "featured_testimonials", title: "同学故事", subtitle: "来自活动现场与课程学习的真实反馈" },
      { type: "charity_summary", title: "公益可信公示", subtitle: "公益池、项目进展和志愿服务入口" }
    ]
  },
  {
    key: "course_conversion",
    label: "课程转化型",
    rows: [
      { type: "hero", title: "系统学习东方文化", subtitle: "从活动体验进入课程学习，用证书和成长记录沉淀长期关系。", config: { ...defaultConfig.hero, primaryButtonText: "查看课程", primaryButtonLink: "/pages/courses/index", backgroundColor: "#4a6b8a" } },
      { type: "course_recommendations", title: "课程推荐", subtitle: "课程、学习记录和证书成长入口" },
      { type: "testimonial_feed", title: "学习与活动心得", subtitle: "用参与者内容提升信任感" },
      { type: "activity_feed", title: "近期活动", subtitle: "先体验，再系统学习" }
    ]
  },
  {
    key: "charity_recruit",
    label: "公益招募型",
    rows: [
      { type: "hero", title: "公益可信公示与志愿共建", subtitle: "公益金、公示项目、帮扶申请和志愿服务形成闭环。", config: { ...defaultConfig.hero, primaryButtonText: "查看公益池", primaryButtonLink: "/pages/charity/index", backgroundColor: "#5b8c5a" } },
      { type: "charity_summary", title: "公益公示摘要", subtitle: "公开展示公益池、项目与志愿服务入口" },
      { type: "quick_nav", title: null, config: { items: [{ label: "帮扶申请", icon: "扶", color: "#5B8C5A", link: "/pages/apply/aid" }, { label: "志愿服务", icon: "愿", color: "#0f766e", link: "/pages/volunteer/index" }, { label: "大使申请", icon: "使", color: "#C43D3D", link: "/pages/apply/ambassador" }, { label: "院长招募", icon: "院", color: "#7A4B24", link: "/pages/recruit/dean" }] } },
      { type: "testimonial_feed", title: "公益参与故事", subtitle: "活动与服务记录让信任可见" }
    ]
  },
  {
    key: "mall_guide",
    label: "商城导购型",
    rows: [
      { type: "hero", title: "慢π文化好物", subtitle: "课程周边、城市店铺与精选商品，配合活动形成转化。", config: { ...defaultConfig.hero, primaryButtonText: "进入商城", primaryButtonLink: "/pages/mall/index", backgroundColor: "#8b5a2b" } },
      { type: "mall_showcase", title: "商城精选", subtitle: "文化好物、店铺精选和优惠活动入口" },
      { type: "activity_feed", title: "搭配近期活动", subtitle: "从活动场景自然进入购买" },
      { type: "testimonial_feed", title: "参与者反馈", subtitle: "用真实体验提升商品和活动信任" }
    ]
  },
  {
    key: "festival_campaign",
    label: "节日专题版",
    rows: [
      { type: "hero", title: "节日活动专题", subtitle: "限时活动、专题课程和优惠入口集中展示，适合节日会场与线下大会。", config: { ...defaultConfig.hero, eyebrow: "限时专题", primaryButtonText: "查看专题活动", primaryButtonLink: "/pages/activity/list", backgroundColor: "#c43d3d" }, layout: { backgroundColor: "#c43d3d", primaryColor: "#c43d3d", accentColor: "#ffd45a", textColor: "#ffffff", mutedColor: "rgba(255,255,255,0.84)", density: "spacious", cardStyle: "elevated" } },
      { type: "quick_nav", title: null, config: { items: [{ label: "专题活动", icon: "专", color: "#C43D3D", link: "/pages/activity/list" }, { label: "优惠好物", icon: "惠", color: "#c2410c", link: "/pages/mall/index" }, { label: "课程礼包", icon: "课", color: "#4a6b8a", link: "/pages/courses/index" }, { label: "我的订单", icon: "单", color: "#8b5a2b", link: "/pages/user/my" }] }, layout: { columns: 4, backgroundColor: "#fff7ec", itemBackgroundColor: "#fffdf5", primaryColor: "#c43d3d", accentColor: "#c2410c" } },
      { type: "image_banner", title: "节日主推 Banner", config: { imageUrl: "", link: "/pages/activity/list", ratio: "3:1", fit: "cover" }, layout: { backgroundColor: "#fff2b8", borderRadius: 14, cardStyle: "elevated" } },
      { type: "featured_activities", title: "节日精选活动", subtitle: "优先展示最适合转化的活动", layout: { backgroundColor: "#fffdf5", primaryColor: "#c43d3d", accentColor: "#ffd45a", cardStyle: "soft" } },
      { type: "mall_showcase", title: "节日好物", subtitle: "把活动场景延伸到商品和优惠" }
    ]
  },
  {
    key: "wuxing_gold_business",
    label: "五行暖金商业版",
    rows: [
      { type: "search_bar", title: null, config: { cityLabel: "搜", placeholder: "搜索商品、商家、活动" }, layout: { backgroundColor: "#FFF2B8", primaryColor: "#E8412F", textColor: "#9E1B12", borderRadius: 999, cardStyle: "outlined" } },
      { type: "hero", title: "清冠优选商城", subtitle: "统一商城展示、筛选与交易动态，金土暖色承载信任，红色强调转化。", config: { ...defaultConfig.hero, eyebrow: "实时更新", primaryButtonText: "发现好物", primaryButtonLink: "/pages/mall/index", backgroundColor: "#FFD45A" }, layout: { backgroundColor: "linear-gradient(135deg, #FFD45A 0%, #FFF2B8 100%)", primaryColor: "#E8412F", accentColor: "#9E1B12", textColor: "#9E1B12", mutedColor: "#9A6A24", borderRadius: 16, density: "spacious", buttonStyle: "pill", cardStyle: "soft", dividerStyle: "soft", surfaceColor: "#FFFDF5", itemBackgroundColor: "#FFF9E8" } },
      { type: "image_banner", title: "精选推荐", config: { imageUrl: "", link: "/pages/mall/index", ratio: "3:1", fit: "cover" }, layout: { backgroundColor: "#FFFDF5", primaryColor: "#E8412F", accentColor: "#FFD45A", borderRadius: 14, cardStyle: "elevated" } },
      { type: "mall_showcase", title: "商家信息", subtitle: "持续更新优质商家与商品信息", layout: { backgroundColor: "#FFFDF5", primaryColor: "#E8412F", accentColor: "#9E1B12", textColor: "#9E1B12", mutedColor: "#9A6A24", borderRadius: 14, itemBackgroundColor: "#FFF9E8", cardStyle: "soft" } },
      { type: "rich_text", title: "交易播报", config: { content: "1762***4319 购买了 1 件商品，平台好物持续更新。", imageUrl: "", link: "" }, layout: { backgroundColor: "#FFFDF5", primaryColor: "#E8412F", accentColor: "#9E1B12", textColor: "#5B2F24", mutedColor: "#9A6A24", borderRadius: 14 } },
      { type: "quick_nav", title: "推荐工具", config: { items: [{ label: "客服中心", icon: "客", color: "#E8412F", link: "/pages/service/index" }, { label: "平台资讯", icon: "讯", color: "#D98A1E", link: "/pages/announcement/list" }, { label: "商家信息", icon: "商", color: "#9A6A24", link: "/pages/mall/index" }, { label: "订单核销", icon: "核", color: "#E8412F", link: "/pages/user/my" }, { label: "数据分析", icon: "数", color: "#D98A1E", link: "/pages/user/my" }, { label: "续费中心", icon: "续", color: "#9A6A24", link: "/pages/user/my" }] }, layout: { columns: 3, backgroundColor: "#FFFDF5", itemBackgroundColor: "#FFF9E8", primaryColor: "#E8412F", accentColor: "#9E1B12", textColor: "#5B2F24", mutedColor: "#9A6A24", borderRadius: 16, cardStyle: "soft" } }
    ]
  }
];
const visualPresets = [
  {
    key: "warm_academy",
    label: "慢π暖色",
    layout: {
      primaryColor: "#8b5a2b",
      accentColor: "#c43d3d",
      textColor: "#3f3428",
      mutedColor: "#8a6b58",
      backgroundColor: "#fff7ec",
      fontStyle: "kaiti",
      density: "comfortable",
      buttonStyle: "pill",
      cardStyle: "soft",
      dividerStyle: "soft"
    }
  },
  {
    key: "quiet_work",
    label: "运营清爽",
    layout: {
      primaryColor: "#0f766e",
      accentColor: "#4a6b8a",
      textColor: "#111827",
      mutedColor: "#667085",
      backgroundColor: "#ffffff",
      fontStyle: "system",
      density: "compact",
      buttonStyle: "rounded",
      cardStyle: "outlined",
      dividerStyle: "line"
    }
  },
  {
    key: "public_green",
    label: "公益共建",
    layout: {
      primaryColor: "#5b8c5a",
      accentColor: "#0f766e",
      textColor: "#173b28",
      mutedColor: "#4b6b57",
      backgroundColor: "#f0fdf4",
      fontStyle: "system",
      density: "comfortable",
      buttonStyle: "pill",
      cardStyle: "soft",
      dividerStyle: "soft"
    }
  },
  {
    key: "mall_editorial",
    label: "商城导购",
    layout: {
      primaryColor: "#7a4b24",
      accentColor: "#c2410c",
      textColor: "#3f3428",
      mutedColor: "#7c5f4c",
      backgroundColor: "#fffaf3",
      fontStyle: "serif",
      density: "spacious",
      buttonStyle: "square",
      cardStyle: "elevated",
      dividerStyle: "none"
    }
  },
  {
    key: "wuxing_gold",
    label: "五行暖金",
    layout: {
      primaryColor: "#E8412F",
      accentColor: "#9E1B12",
      textColor: "#5B2F24",
      mutedColor: "#9A6A24",
      backgroundColor: "#FFFDF5",
      surfaceColor: "#FFFDF5",
      itemBackgroundColor: "#FFF9E8",
      chipBackgroundColor: "#FFF2B8",
      fontStyle: "system",
      density: "comfortable",
      buttonStyle: "pill",
      cardStyle: "soft",
      dividerStyle: "soft",
      borderRadius: 14,
      imageRadius: 12,
      cardGap: 14
    }
  }
];
type UiTemplateKit = {
  key: string;
  label: string;
  category: string;
  description: string;
  scene: string;
  palette: string[];
  stylePresetKey: string;
  rows: TemplateRow[];
};
const uiTemplateKits: UiTemplateKit[] = decorationTemplates.map((template) => {
  const meta: Record<string, Omit<UiTemplateKit, "key" | "label" | "rows">> = {
    activity_ops: { category: "活动", description: "搜索、精选活动、心得口碑组合，适合报名转化。", scene: "活动首页 / 本地活动运营", palette: ["#0f766e", "#4a6b8a", "#ffffff", "#667085"], stylePresetKey: "quiet_work" },
    academy_brand: { category: "品牌", description: "品牌故事、同学故事和公益入口，适合讲清慢π理念。", scene: "品牌首页 / 文化空间", palette: ["#5b2f24", "#fff7ec", "#c43d3d", "#8b5a2b"], stylePresetKey: "warm_academy" },
    course_conversion: { category: "课程", description: "课程推荐与活动体验联动，适合课程转化。", scene: "课程首页 / 训练营", palette: ["#4a6b8a", "#0f766e", "#ffffff", "#667085"], stylePresetKey: "quiet_work" },
    charity_recruit: { category: "公益", description: "公益公示、志愿服务和帮扶入口，突出可信共建。", scene: "公益池 / 志愿招募", palette: ["#5b8c5a", "#0f766e", "#f0fdf4", "#173b28"], stylePresetKey: "public_green" },
    mall_guide: { category: "商城", description: "商城入口、活动联动和反馈口碑，适合商品导购。", scene: "商城首页 / 文化好物", palette: ["#7a4b24", "#c2410c", "#fffaf3", "#3f3428"], stylePresetKey: "mall_editorial" },
    festival_campaign: { category: "专题", description: "大 Banner、限时入口和节日活动组合，适合短期专题投放。", scene: "节日专题 / 线下大会", palette: ["#c43d3d", "#ffd45a", "#fff7ec", "#8b5a2b"], stylePresetKey: "warm_academy" },
    wuxing_gold_business: { category: "特色", description: "参考五行金土暖色，适合商城、会员中心、广告和工具入口。", scene: "商城营销 / 商家工具 / 广告活动", palette: ["#FFD45A", "#FFF2B8", "#FFFDF5", "#E8412F", "#9E1B12", "#9A6A24"], stylePresetKey: "wuxing_gold" }
  };
  return { key: template.key, label: template.label, rows: template.rows, ...(meta[template.key] || meta.activity_ops) };
});
const rows = ref<HomepageSectionView[]>([]);
const tenants = ref<any[]>([]);
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const drawer = ref(false);
const editorOpen = ref(false);
const editorTab = ref("content");
const editingId = ref<number | null>(null);
const draggedId = ref<number | null>(null);
const formSnapshot = ref("");
const form = reactive<SectionForm>({ type: "hero", title: "", subtitle: "", enabled: true, sortOrder: 0, config: {}, layout: {} });
const configText = ref("{}");
const layoutText = ref("{}");
const filters = reactive({ tenantId: undefined as number | undefined, pageKey: "home" });
const selectedTemplateKey = ref("activity_ops");
const copyFromPageKey = ref("home");
const lastPublishedRows = ref<HomepageSectionView[]>([]);
const lastPublishedLoaded = ref(false);
const restoreSnapshotSavedAt = ref("");
const helpDialogVisible = ref(false);
const healthDialogVisible = ref(false);
const healthIssues = ref<HealthIssue[]>([]);
const linkPickerVisible = ref(false);
const crossCopyDialogVisible = ref(false);
const uiKitDialogVisible = ref(false);
const uiKitPreviewKey = ref(uiTemplateKits[0]?.key || "activity_ops");
const uiKitApplyingKey = ref("");
const crossCopySubmitting = ref(false);
const crossCopyResult = ref("");
const versionDialogVisible = ref(false);
const versionLoading = ref(false);
const versionSaving = ref(false);
const versionRestoringId = ref<number | null>(null);
const versionDeletingId = ref<number | null>(null);
const versions = ref<DecorationVersion[]>([]);
const templateDialogVisible = ref(false);
const templateLoading = ref(false);
const templateSaving = ref(false);
const templateApplyingId = ref<number | null>(null);
const templateDeletingId = ref<number | null>(null);
const savedTemplates = ref<DecorationTemplate[]>([]);
const templateForm = reactive({ name: "", category: "运营模板", description: "" });
const crossCopyForm = reactive({
  mode: "current_page" as CrossCopyMode,
  sourceTenantId: undefined as number | undefined,
  targetTenantId: undefined as number | undefined,
  sourcePageKey: "home",
  targetPageKey: "home"
});
const linkPicker = reactive({
  target: null as LinkPickerTarget | null,
  mode: "page" as "page" | "detail" | "external",
  pagePath: "/pages/index/index",
  detailType: "activity" as "activity" | "course" | "product" | "community",
  detailId: "",
  externalUrl: "",
  displayName: ""
});

const linkPageOptions = [
  { label: "首页", path: "/pages/index/index", group: "常用页面" },
  { label: "活动列表", path: "/pages/activity/list", group: "常用页面" },
  { label: "课程首页", path: "/pages/courses/index", group: "常用页面" },
  { label: "共修首页", path: "/pages/community/index", group: "常用页面" },
  { label: "商城首页", path: "/pages/mall/index", group: "常用页面" },
  { label: "我的", path: "/pages/user/my", group: "常用页面" },
  { label: "今日打卡", path: "/pages/community/checkin", group: "常用页面" },
  { label: "公告中心", path: "/pages/announcement/list", group: "服务页面" },
  { label: "服务中心", path: "/pages/service/index", group: "服务页面" },
  { label: "品牌故事", path: "/pages/brand/story", group: "服务页面" },
  { label: "公益池", path: "/pages/charity/index", group: "服务页面" },
  { label: "城市合伙人", path: "/pages/partner/index", group: "服务页面" },
  { label: "登录", path: "/pages/user/login", group: "用户页面" },
  { label: "我的订单", path: "/pages/user/orders", group: "用户页面" },
  { label: "商城订单", path: "/pages/user/mall-orders", group: "用户页面" },
  { label: "我的心得", path: "/pages/user/community-posts", group: "用户页面" }
];
const detailLinkOptions = [
  { type: "activity", label: "活动详情", path: "/pages/activity/detail", idLabel: "活动 ID" },
  { type: "course", label: "课程详情", path: "/pages/course/detail", idLabel: "课程 ID" },
  { type: "product", label: "商品详情", path: "/pages/mall/detail", idLabel: "商品 ID" },
  { type: "community", label: "动态详情", path: "/pages/community/detail", idLabel: "动态 ID" }
] as const;

const toolbarHelpItems = [
  { title: "选择页面", text: "决定你正在装修哪一个前台页面，例如首页、活动列表、动态详情、我的页面或底部导航。" },
  { title: "选择商家", text: "平台超管可切换装修范围；不选商家时编辑平台默认装修，选中商家时只编辑该商家的独立装修。" },
  { title: "发布前预览", text: "打开当前页面的 H5 预览链接，同时复制链接，方便用手机微信或浏览器检查真实效果。" },
  { title: "复制链接", text: "只复制当前预览地址，不打开新窗口，适合发给运营同事或在手机上测试。" },
  { title: "装修模板 / 应用模板", text: "模板是一套预设模块组合。应用模板会替换当前页面已有模块，适合新页面快速起步，已有装修请先确认再点。" },
  { title: "保存版本", text: "把当前页面模块保存为一个数据库版本，适合每次大改前留档，后续可在版本历史中一键回滚。" },
  { title: "版本历史", text: "查看当前页面、当前商家范围下保存过的版本，支持恢复和删除旧版本。" },
  { title: "保存为模板 / 模板库", text: "把当前页面沉淀成可复用模板；模板库可以把保存过的模板应用到当前页面。" },
  { title: "复制页面配置", text: "从另一个页面复制模块到当前页面，会替换当前页面模块，适合复用布局后再微调文案和图片。" },
  { title: "跨商家复制", text: "平台超管把一个商家的装修复制到另一个商家，可复制当前页面，也可复制来源商家有配置的全部页面。" },
  { title: "恢复上次发布版本", text: "回到首次修改前自动保存的版本，适合改乱后撤回本次编辑。" },
  { title: "恢复默认装修", text: "重置为系统默认模块。这个动作会覆盖当前范围、当前页面的装修内容。" },
  { title: "刷新", text: "重新读取后台已保存的模块数据，用来确认保存后是否真正生效。" }
];

const orderedRows = computed(() => [...rows.value].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
const canEdit = computed(() => true);
const currentPageOption = computed(() => pageOptions.find((item) => item.key === filters.pageKey) || pageOptions[0]);
const scopeTitle = computed(() => `${currentPageOption.value.label} · ${isPlatformAdmin() && filters.tenantId ? "商家独立装修" : isPlatformAdmin() ? "平台全局默认装修" : "当前商家装修"}`);
const scopeTip = computed(() => {
  if (!isPlatformAdmin()) return "";
  return filters.tenantId ? "当前正在编辑选中商家的独立 H5 装修；清空商家筛选后可编辑平台全局默认装修。" : "当前正在编辑平台全局默认装修；未单独装修的商家会自动继承这套配置。";
});
const pageTitle = computed(() => (isPlatformAdmin() ? "前台全局装修" : "前台装修"));
const pageDescription = computed(() => (isPlatformAdmin() ? "配置平台默认或指定商家的 H5/小程序首页、底部菜单、我的页面和内页布局。" : "配置本商家 H5/小程序前台装修，保存后刷新前台立即生效。"));
const selectedTenant = computed(() => tenants.value.find((tenant) => tenant.id === filters.tenantId));
const saveScopeName = computed(() => (isPlatformAdmin() && filters.tenantId ? selectedTenant.value?.name || selectedTenant.value?.code || "选中商家" : isPlatformAdmin() ? "平台全局默认装修" : "当前商家装修"));
const templateDefaultName = computed(() => `${saveScopeName.value} · ${currentPageOption.value.label}`);
const previewTenantCode = computed(() => (isPlatformAdmin() ? selectedTenant.value?.code || "" : currentTenantCode()));
const previewScopeName = computed(() => (isPlatformAdmin() && !previewTenantCode.value ? "平台默认首页" : selectedTenant.value?.name || tenantDisplayName({ tenant: { code: previewTenantCode.value } })));
const previewUrl = computed(() => h5RoutePreviewUrl(previewTenantCode.value, currentPageOption.value.route));
const crossCopySourceTenantName = computed(() => tenantNameById(crossCopyForm.sourceTenantId));
const crossCopyTargetTenantName = computed(() => tenantNameById(crossCopyForm.targetTenantId));
const crossCopyPlanText = computed(() => {
  if (crossCopyForm.mode === "all_pages") return `将「${crossCopySourceTenantName.value}」已有装修模块的页面复制到「${crossCopyTargetTenantName.value}」，来源为空的页面会跳过。`;
  const sourcePage = pageOptions.find((item) => item.key === crossCopyForm.sourcePageKey)?.label || crossCopyForm.sourcePageKey;
  const targetPage = pageOptions.find((item) => item.key === crossCopyForm.targetPageKey)?.label || crossCopyForm.targetPageKey;
  return `将「${crossCopySourceTenantName.value}」的「${sourcePage}」复制到「${crossCopyTargetTenantName.value}」的「${targetPage}」。`;
});
const currentFormSnapshot = computed(() => JSON.stringify({
  type: form.type,
  title: form.title,
  subtitle: form.subtitle,
  enabled: form.enabled,
  sortOrder: form.sortOrder,
  configText: configText.value,
  layoutText: layoutText.value
}));
const restoreSnapshotKey = computed(() => {
  const scope = isPlatformAdmin()
    ? filters.tenantId ? `tenant-${filters.tenantId}` : "platform-global"
    : `tenant-${currentTenantCode() || "current"}`;
  return `homepage-builder-restore:${scope}:${filters.pageKey}`;
});
const restoreSnapshotHint = computed(() => restoreSnapshotSavedAt.value ? `已保留 ${restoreSnapshotSavedAt.value} 的恢复快照。` : "首次修改前会自动保留当前发布版本，刷新后台后仍可恢复。");
const hasUnsavedChanges = computed(() => drawer.value && formSnapshot.value !== currentFormSnapshot.value);
const hasEditorUnsavedChanges = computed(() => editorOpen.value && formSnapshot.value !== currentFormSnapshot.value);
const drawerPreviewRow = computed(() => currentDraftPreviewRow());
const defaultPreviewRows = computed(() => buildDefaultPreviewRows(filters.pageKey));
const previewBaseRows = computed(() => (orderedRows.value.length ? orderedRows.value : defaultPreviewRows.value));
const previewRows = computed(() => {
  const list = previewBaseRows.value.map((item) => ({ ...item, config: cloneJson(item.config || {}), layout: cloneJson(item.layout || {}) }));
  const draft = currentDraftPreviewRow();
  if (draft) {
    const index = editingId.value ? list.findIndex((item) => item.id === editingId.value) : -1;
    if (index >= 0) list.splice(index, 1, draft);
    else list.push(draft);
  }
  return list.filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
});
const hasDefaultPreviewFallback = computed(() => !orderedRows.value.length);
const healthSummary = computed(() => {
  const errors = healthIssues.value.filter((item) => item.level === "error").length;
  const warnings = healthIssues.value.filter((item) => item.level === "warning").length;
  if (!healthIssues.value.length) return "未检测";
  if (errors) return `${errors} 个错误，${warnings} 个提醒`;
  if (warnings) return `${warnings} 个提醒`;
  return "通过";
});
const selectedUiTemplateKit = computed(() => uiTemplateKits.find((item) => item.key === uiKitPreviewKey.value) || uiTemplateKits[0]);
const uiKitPreviewRows = computed(() => selectedUiTemplateKit.value ? templateRowsToPreviewRows(selectedUiTemplateKit.value.rows) : []);
const linkPageGroups = computed(() => [...new Set(linkPageOptions.map((item) => item.group))]);
const linkPickerPreviewValue = computed(() => {
  try {
    return buildLinkPickerValue();
  } catch {
    return "请补全链接信息";
  }
});

function typeLabel(type: string) {
  return moduleTypes.find((item) => item.type === type)?.label || type;
}

function normalizePagePath(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return text.startsWith("/") ? text : `/${text}`;
}

function linkDisplayName(value: unknown) {
  const path = normalizePagePath(value);
  if (!path) return "未设置";
  const staticPage = linkPageOptions.find((item) => item.path === path);
  if (staticPage) return staticPage.label;
  const detail = detailLinkOptions.find((item) => path.startsWith(`${item.path}?`));
  if (detail) {
    const id = new URLSearchParams(path.split("?")[1] || "").get("id");
    return `${detail.label}${id ? ` #${id}` : ""}`;
  }
  return /^https?:\/\//i.test(path) ? "外部 H5 链接" : path;
}

function linkPickerTargetValue(target: LinkPickerTarget | null) {
  if (!target) return "";
  if (target.kind === "config") return String(form.config[target.key] || "");
  const list = Array.isArray(form.config[target.arrayKey]) ? form.config[target.arrayKey] : [];
  return String(list[target.index]?.[target.key] || "");
}

function seedLinkPicker(value: string) {
  const path = normalizePagePath(value);
  const detail = detailLinkOptions.find((item) => path.startsWith(`${item.path}?`));
  if (/^https?:\/\//i.test(path)) {
    linkPicker.mode = "external";
    linkPicker.externalUrl = path;
  } else if (detail) {
    linkPicker.mode = "detail";
    linkPicker.detailType = detail.type;
    linkPicker.detailId = new URLSearchParams(path.split("?")[1] || "").get("id") || "";
  } else {
    linkPicker.mode = "page";
    linkPicker.pagePath = linkPageOptions.find((item) => item.path === path)?.path || path || "/pages/index/index";
  }
}

function openConfigLinkPicker(key: string, label: string) {
  linkPicker.target = { kind: "config", key, label };
  seedLinkPicker(String(form.config[key] || ""));
  linkPicker.displayName = linkDisplayName(form.config[key]);
  linkPickerVisible.value = true;
}

function openArrayLinkPicker(arrayKey: "items" | "tools", index: number, key: string, label: string) {
  linkPicker.target = { kind: "array", arrayKey, index, key, label };
  const value = linkPickerTargetValue(linkPicker.target);
  seedLinkPicker(value);
  linkPicker.displayName = linkDisplayName(value);
  linkPickerVisible.value = true;
}

function buildLinkPickerValue() {
  if (linkPicker.mode === "external") return String(linkPicker.externalUrl || "").trim();
  if (linkPicker.mode === "detail") {
    const option = detailLinkOptions.find((item) => item.type === linkPicker.detailType) || detailLinkOptions[0];
    const id = String(linkPicker.detailId || "").trim();
    if (!id) throw new Error(`请输入${option.idLabel}`);
    return `${option.path}?id=${encodeURIComponent(id)}`;
  }
  return normalizePagePath(linkPicker.pagePath);
}

function applyLinkPicker() {
  if (!linkPicker.target) return;
  let value = "";
  try {
    value = buildLinkPickerValue();
  } catch (error: any) {
    ElMessage.warning(error.message || "请选择链接");
    return;
  }
  if (linkPicker.target.kind === "config") {
    form.config[linkPicker.target.key] = value;
  } else {
    updateConfigArrayItem(linkPicker.target.arrayKey, linkPicker.target.index, linkPicker.target.key, value);
  }
  syncJsonText();
  linkPicker.displayName = linkDisplayName(value);
  linkPickerVisible.value = false;
  ElMessage.success(`已选择：${linkDisplayName(value)}`);
}

function isProbablyImageUrl(value: unknown) {
  const text = String(value || "").trim();
  return Boolean(text && (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(text) || text.startsWith("/uploads/") || /^https?:\/\//i.test(text)));
}

function isSafeImageUrl(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return true;
  return text.startsWith("/uploads/") || text.startsWith("https://") || text.startsWith("data:");
}

function collectLinks(row: HomepageSectionView) {
  const config = (row.config || {}) as Record<string, any>;
  const result: Array<{ value: string; source: string }> = [];
  for (const key of ["link", "path", "url", "href", "primaryButtonLink"]) {
    if (typeof config[key] === "string") result.push({ value: config[key], source: `${row.title || typeLabel(row.type)} / ${key}` });
  }
  for (const arrayKey of ["items", "tools"] as const) {
    const items = Array.isArray(config[arrayKey]) ? config[arrayKey] : [];
    items.forEach((item: any, index: number) => {
      for (const key of ["link", "path", "url", "href"]) {
        if (typeof item?.[key] === "string") result.push({ value: item[key], source: `${row.title || typeLabel(row.type)} / ${arrayKey}[${index + 1}].${key}` });
      }
    });
  }
  return result;
}

function collectImages(row: HomepageSectionView) {
  const config = (row.config || {}) as Record<string, any>;
  const layout = (row.layout || {}) as Record<string, any>;
  const result: Array<{ value: string; source: string }> = [];
  for (const [key, value] of Object.entries({ ...config, ...layout })) {
    if (typeof value === "string" && isProbablyImageUrl(value)) result.push({ value, source: `${row.title || typeLabel(row.type)} / ${key}` });
  }
  for (const arrayKey of ["items", "tools"] as const) {
    const items = Array.isArray(config[arrayKey]) ? config[arrayKey] : [];
    items.forEach((item: any, index: number) => {
      for (const [key, value] of Object.entries(item || {})) {
        if (typeof value === "string" && isProbablyImageUrl(value)) result.push({ value, source: `${row.title || typeLabel(row.type)} / ${arrayKey}[${index + 1}].${key}` });
      }
    });
  }
  return result;
}

function isKnownMiniProgramPath(value: string) {
  const path = normalizePagePath(value);
  if (!path || /^https?:\/\//i.test(path)) return true;
  if (linkPageOptions.some((item) => item.path === path)) return true;
  return detailLinkOptions.some((item) => path.startsWith(`${item.path}?id=`));
}

function addHealthIssue(list: HealthIssue[], level: "error" | "warning", title: string, detail: string, sectionId?: number) {
  list.push({ level, title, detail, sectionId });
}

function buildHealthIssues() {
  const issues: HealthIssue[] = [];
  const visibleRows = orderedRows.value.filter((row) => row.enabled);
  if (!visibleRows.length) addHealthIssue(issues, "warning", "当前页面没有启用模块", "前台会显示默认兜底或空页面，建议至少保留一个主视觉或内容模块。");

  for (const singletonType of ["bottom_nav", "my_page", "inner_pages"]) {
    const matches = visibleRows.filter((row) => row.type === singletonType);
    if (matches.length > 1) {
      addHealthIssue(issues, "warning", `存在 ${matches.length} 个${typeLabel(singletonType)}`, "前台会按排序保留最后一份，后台建议只保留一份，避免运营误判。", matches[0]?.id);
    }
  }

  for (const row of visibleRows) {
    const config = (row.config || {}) as Record<string, any>;
    if (row.type === "bottom_nav") {
      const items = Array.isArray(config.items) ? config.items.filter((item: any) => item?.enabled !== false) : [];
      if (items.length > 5) addHealthIssue(issues, "error", "底部导航超过 5 项", "小程序和 H5 底部导航最多建议 5 项，请删除或停用多余入口。", row.id);
      if (!items.length) addHealthIssue(issues, "warning", "底部导航没有启用入口", "用户端底部会缺少主入口，请至少启用一个菜单。", row.id);
    }
    if (row.type === "image_banner" && !String(config.imageUrl || "").trim()) {
      addHealthIssue(issues, "error", "图片广告缺少图片", "图片广告模块没有图片时前台会显示占位，不适合作为上线页面。", row.id);
    }
    if (row.type === "hero" && !String(row.title || "").trim()) {
      addHealthIssue(issues, "warning", "主视觉缺少标题", "首屏标题为空会影响用户理解页面。", row.id);
    }
    for (const image of collectImages(row)) {
      if (!isSafeImageUrl(image.value)) addHealthIssue(issues, "warning", "图片地址可能无法在小程序显示", `${image.source} 使用了非 HTTPS 或非 /uploads 地址：${image.value}`, row.id);
    }
    for (const link of collectLinks(row)) {
      const value = normalizePagePath(link.value);
      if (!value) {
        addHealthIssue(issues, "warning", "存在空跳转", `${link.source} 为空，用户点击后不会跳转。`, row.id);
      } else if (/^https?:\/\//i.test(value)) {
        addHealthIssue(issues, "warning", "小程序外链需要业务域名", `${link.source} 是外部 H5：${value}，小程序正式版需要配置业务域名或改成内部页面。`, row.id);
      } else if (!isKnownMiniProgramPath(value)) {
        addHealthIssue(issues, "warning", "跳转路径未识别", `${link.source} 为 ${value}，建议用链接选择器重新选择。`, row.id);
      }
    }
  }

  if (isPlatformAdmin() && !filters.tenantId) {
    addHealthIssue(issues, "warning", "当前编辑平台默认装修", "如果要修改慢π演示商家，请先在商家筛选中选中 qiwai-showcase；小程序默认租户也要随构建参数保持一致。");
  }
  if (previewTenantCode.value && previewTenantCode.value !== "qiwai-showcase") {
    addHealthIssue(issues, "warning", "当前商家与试运营默认商家不同", `当前预览商家为 ${previewTenantCode.value}，小程序构建时的 VITE_DEFAULT_TENANT_CODE 需要与实际试运营商家一致。`);
  }
  return issues;
}

function runHealthCheck() {
  healthIssues.value = buildHealthIssues();
  healthDialogVisible.value = true;
}

function issueType(level: "error" | "warning") {
  return level === "error" ? "error" : "warning";
}

function editIssueSection(issue: HealthIssue) {
  const row = rows.value.find((item) => item.id === issue.sectionId);
  if (row) edit(row);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value || {}));
}

function restorableRows(list: HomepageSectionView[]) {
  return list.map((item) => ({
    pageKey: item.pageKey,
    type: item.type,
    title: item.title,
    subtitle: item.subtitle,
    enabled: item.enabled,
    sortOrder: item.sortOrder,
    config: cloneJson(item.config || {}),
    layout: cloneJson(item.layout || {})
  })) as HomepageSectionView[];
}

function formatSnapshotTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function readRestoreSnapshot() {
  try {
    const raw = window.localStorage.getItem(restoreSnapshotKey.value);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.rows)) return null;
    return { rows: parsed.rows as HomepageSectionView[], savedAt: formatSnapshotTime(parsed.savedAt) };
  } catch {
    return null;
  }
}

function rememberBeforeMutation() {
  const rowsToSave = restorableRows(orderedRows.value);
  const savedAt = new Date().toISOString();
  try {
    window.localStorage.setItem(restoreSnapshotKey.value, JSON.stringify({ version: 1, savedAt, rows: rowsToSave }));
  } catch {
    // localStorage can be unavailable in privacy contexts; keep the in-memory fallback.
  }
  lastPublishedRows.value = cloneJson(rowsToSave);
  lastPublishedLoaded.value = true;
  restoreSnapshotSavedAt.value = formatSnapshotTime(savedAt);
}

function clearRestoreSnapshot() {
  try {
    window.localStorage.removeItem(restoreSnapshotKey.value);
  } catch {
    // Ignore storage cleanup failures; the current in-memory state is still correct.
  }
  restoreSnapshotSavedAt.value = "";
}

function previewRow(
  index: number,
  type: HomepageSectionType | string,
  overrides: Partial<HomepageSectionView> = {}
): HomepageSectionView {
  return {
    id: -10000 - index,
    pageKey: filters.pageKey,
    type,
    title: overrides.title ?? typeLabel(type),
    subtitle: overrides.subtitle ?? null,
    enabled: overrides.enabled ?? true,
    sortOrder: overrides.sortOrder ?? (index + 1) * 10,
    config: cloneJson(overrides.config || defaultConfig[type] || {}),
    layout: cloneJson(overrides.layout || defaultLayout[type] || {}),
    data: overrides.data
  };
}

function buildDefaultPreviewRows(pageKey: string): HomepageSectionView[] {
  if (pageKey === "home") {
    return [
      previewRow(0, "search_bar", { title: null, config: { cityLabel: "本地", placeholder: "搜索沙龙、读书会、培训" } }),
      previewRow(1, "hero", {
        title: "发现值得参加的线下活动",
        subtitle: "沙龙、读书会、训练营和社群聚会，一站完成筛选、报名、付款确认和签到。"
      }),
      previewRow(2, "announcement_bar", { title: "公告" }),
      previewRow(3, "quick_nav", { title: null }),
      previewRow(4, "category_grid", { title: "活动社区", subtitle: "按兴趣快速进入活动池" }),
      previewRow(5, "featured_activities", { title: "精选活动", subtitle: "主办方推荐，适合优先查看" }),
      previewRow(6, "activity_tabs", { title: null }),
      previewRow(7, "activity_feed", { title: null }),
      previewRow(8, "bottom_nav", { title: "前台底部导航" })
    ];
  }

  const label = currentPageOption.value.label;
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
    review_page: "你的反馈会帮助主办方持续改进活动体验。"
  };
  const hideNav = ["activity_detail", "activity_register", "login_page"].includes(pageKey);
  const list = [
    ...(pageKey === "user_my" ? [previewRow(0, "my_page", { title: "我的", subtitle: "会员权益、订单、课程和管理入口", sortOrder: 5 })] : []),
    previewRow(1, "hero", {
      title: label,
      subtitle: subtitleMap[pageKey] || "",
      config: { ...defaultConfig.hero, eyebrow: "慢π", showStats: false, primaryButtonText: "", primaryButtonLink: "", backgroundColor: "#0f766e" },
      layout: { spacingBottom: 16, density: "compact", borderRadius: 8 }
    }),
    previewRow(2, "rich_text", {
      title: "页面说明",
      config: { content: subtitleMap[pageKey] || "", imageUrl: "", link: "" },
      layout: { spacingBottom: 18 }
    })
  ];
  if (!hideNav) list.push(previewRow(3, "bottom_nav", { title: "前台底部导航", sortOrder: 90 }));
  return list;
}

function isFocusedPreviewRow(row: HomepageSectionView) {
  if (!editorOpen.value || !drawerPreviewRow.value) return false;
  if (editingId.value) return row.id === editingId.value;
  return row.id === drawerPreviewRow.value.id;
}

function clampPercent(value: unknown, fallback: number) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, 0), 100);
}

function hexToRgb(color: unknown) {
  const value = String(color || "").trim();
  const match = value.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return "15, 35, 39";
  return `${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}`;
}

function rgba(color: unknown, opacity: unknown, fallback = 100) {
  return `rgba(${hexToRgb(color)}, ${clampPercent(opacity, fallback) / 100})`;
}

function heroBackgroundStyle(config: Record<string, any>) {
  const base = config.backgroundColor || "#0f766e";
  const overlay = rgba(config.overlayColor || "#0f2327", config.overlayOpacity, config.backgroundImage ? 42 : 0);
  const fit = config.backgroundFit === "contain" ? "contain" : "cover";
  return config.backgroundImage ? `linear-gradient(90deg, ${overlay}, ${overlay}), url(${config.backgroundImage}) center/${fit} no-repeat, ${base}` : base;
}

function previewHeroStyle(row: HomepageSectionView) {
  const config = (row.config || {}) as Record<string, any>;
  const layout = (row.layout || {}) as Record<string, any>;
  return {
    background: heroBackgroundStyle(config),
    borderRadius: `${Number(layout.borderRadius ?? 8)}px`,
    marginBottom: `${Number(layout.spacingBottom ?? 10)}px`
  };
}

function previewSectionStyle(row: HomepageSectionView) {
  const layout = (row.layout || {}) as Record<string, any>;
  const background = layout.backgroundImage ? `url(${layout.backgroundImage}) center/cover no-repeat, ${layout.backgroundColor || "#fff"}` : layout.backgroundColor || "#fff";
  return {
    background,
    borderRadius: `${Number(layout.borderRadius ?? 8)}px`,
    marginBottom: `${Number(layout.spacingBottom ?? 10)}px`,
    color: String(layout.textColor || "#111827")
  };
}

function enabledNavItems(row: HomepageSectionView) {
  return (((row.config as any)?.items || []) as any[]).filter((nav: any) => nav?.enabled !== false).slice(0, 5);
}

function previewNavCount(row: HomepageSectionView) {
  return Math.max(enabledNavItems(row).length, 1);
}

function applyVisualPreset(key: string) {
  const preset = visualPresets.find((item) => item.key === key);
  if (!preset) return;
  form.layout = { ...(form.layout || {}), ...cloneJson(preset.layout) };
  syncJsonText();
}

function resetForm(type: HomepageSectionType | string) {
  Object.assign(form, {
    type,
    title: typeLabel(type),
    subtitle: "",
    enabled: true,
    sortOrder: orderedRows.value.length ? Math.max(...orderedRows.value.map((item) => item.sortOrder)) + 10 : 10,
    config: cloneJson(defaultConfig[type] || {}),
    layout: cloneJson(defaultLayout[type] || {})
  });
  syncJsonText();
}

function syncJsonText() {
  configText.value = JSON.stringify(form.config || {}, null, 2);
  layoutText.value = JSON.stringify(form.layout || {}, null, 2);
}

function captureFormSnapshot() {
  formSnapshot.value = currentFormSnapshot.value;
}

function homepageScopeParams() {
  const params: Record<string, unknown> = { pageKey: filters.pageKey };
  if (isPlatformAdmin() && filters.tenantId) params.tenantId = filters.tenantId;
  return { params };
}

function homepageParamsFor(tenantId: number | undefined, pageKey: string) {
  const params: Record<string, unknown> = { pageKey };
  if (tenantId) params.tenantId = tenantId;
  return { params };
}

function tenantNameById(id?: number) {
  const tenant = tenants.value.find((item) => Number(item.id) === Number(id || 0));
  return tenant ? tenant.name || tenant.code : "未选择商家";
}

function sectionCopyPayload(row: HomepageSectionView, pageKey: string, index: number) {
  return {
    pageKey,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle || "",
    enabled: row.enabled,
    sortOrder: (index + 1) * 10,
    config: cloneJson(row.config || {}),
    layout: cloneJson(row.layout || {})
  };
}

function firstQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function validPageKey(value: unknown) {
  const key = String(firstQueryValue(value) || "").trim();
  return pageOptions.some((item) => item.key === key) ? key : "home";
}

function validTenantId(value: unknown) {
  const id = Number(firstQueryValue(value) || 0);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

function applyRouteFilters() {
  filters.pageKey = validPageKey(route.query.pageKey);
  filters.tenantId = isPlatformAdmin() ? validTenantId(route.query.tenantId) : undefined;
}

function syncRouteFilters() {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(route.query)) {
    const normalized = String(firstQueryValue(value) || "");
    if (normalized) query[key] = normalized;
  }
  query.pageKey = filters.pageKey;
  if (isPlatformAdmin() && filters.tenantId) query.tenantId = String(filters.tenantId);
  else delete query.tenantId;
  router.replace({ query });
}

async function load(options: { updateSnapshot?: boolean } = {}) {
  loading.value = true;
  try {
    rows.value = await api.get<any, HomepageSectionView[]>("/admin/homepage/sections", homepageScopeParams());
    if (options.updateSnapshot !== false) {
      const cached = readRestoreSnapshot();
      lastPublishedRows.value = cloneJson(cached?.rows || rows.value);
      lastPublishedLoaded.value = true;
      restoreSnapshotSavedAt.value = cached?.savedAt || "";
    }
  } finally {
    loading.value = false;
  }
}

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}

async function handleScopeChanged() {
  if (editorOpen.value) {
    if (hasEditorUnsavedChanges.value) ElMessage.warning("已切换装修范围，当前未保存的模块编辑已关闭");
    editorOpen.value = false;
    drawer.value = false;
    editingId.value = null;
    captureFormSnapshot();
  }
  syncRouteFilters();
  await load();
}

function addSection(type: HomepageSectionType) {
  if (!canEdit.value) return;
  editingId.value = null;
  resetForm(type);
  captureFormSnapshot();
  editorTab.value = "content";
  editorOpen.value = true;
  drawer.value = false;
}

function edit(row: HomepageSectionView) {
  if (!canEdit.value) return;
  editingId.value = row.id;
  Object.assign(form, {
    type: row.type,
    title: row.title || "",
    subtitle: row.subtitle || "",
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    config: cloneJson(row.config || {}),
    layout: cloneJson(row.layout || {})
  });
  syncJsonText();
  captureFormSnapshot();
  editorTab.value = "content";
  editorOpen.value = true;
  drawer.value = false;
}

function selectPreviewRow(row: HomepageSectionView) {
  if (!canEdit.value) return;
  const saved = rows.value.find((item) => item.id === row.id);
  if (!saved) {
    ElMessage.info("这是默认预览模块，请先添加或恢复默认装修后再编辑。");
    return;
  }
  edit(saved);
}

async function copy(row: HomepageSectionView) {
  if (!canEdit.value) return;
  const payload = {
    pageKey: filters.pageKey,
    type: row.type,
    title: `${row.title || typeLabel(row.type)} 副本`,
    subtitle: row.subtitle || "",
    enabled: row.enabled,
    sortOrder: orderedRows.value.length ? Math.max(...orderedRows.value.map((item) => item.sortOrder)) + 10 : 10,
    config: row.config || {},
    layout: row.layout || {}
  };
  rememberBeforeMutation();
  await api.post("/admin/homepage/sections", payload, homepageScopeParams());
  ElMessage.success("模块已复制");
  load({ updateSnapshot: false });
}

async function remove(row: HomepageSectionView) {
  if (!canEdit.value) return;
  await ElMessageBox.confirm(`确认删除「${row.title || typeLabel(row.type)}」？删除后 H5 将不再显示该模块。`, "删除模块", { type: "warning" });
  rememberBeforeMutation();
  await api.delete(`/admin/homepage/sections/${row.id}`, homepageScopeParams());
  ElMessage.success("模块已删除");
  load({ updateSnapshot: false });
}

async function toggle(row: HomepageSectionView) {
  if (!canEdit.value) return;
  rememberBeforeMutation();
  await api.patch(`/admin/homepage/sections/${row.id}`, {
    pageKey: filters.pageKey,
    type: row.type,
    title: row.title || "",
    subtitle: row.subtitle || "",
    sortOrder: row.sortOrder,
    config: row.config || {},
    layout: row.layout || {},
    enabled: !row.enabled
  }, homepageScopeParams());
  ElMessage.success(!row.enabled ? "模块已启用" : "模块已停用");
  load({ updateSnapshot: false });
}

function parseJson(text: string, label: string) {
  const parsed = JSON.parse(text || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${label} 必须是 JSON object`);
  return parsed;
}

function parseJsonOrNull(text: string) {
  try {
    const parsed = parseJson(text, "JSON");
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function currentDraftPreviewRow(): HomepageSectionView | null {
  if (!editorOpen.value) return null;
  const config = parseJsonOrNull(configText.value);
  const layout = parseJsonOrNull(layoutText.value);
  if (!config || !layout) return null;
  return {
    id: editingId.value || -1,
    pageKey: filters.pageKey,
    type: form.type,
    title: form.title || null,
    subtitle: form.subtitle || null,
    enabled: form.enabled,
    sortOrder: Number(form.sortOrder || 0),
    config,
    layout
  };
}

async function submit() {
  if (!canEdit.value) return;
  try {
    form.config = parseJson(configText.value, "config");
    form.layout = parseJson(layoutText.value, "layout");
  } catch (error: any) {
    ElMessage.error(error.message || "JSON 格式不正确");
    return;
  }
  saving.value = true;
  try {
    if (form.type === "bottom_nav") form.config.items = sanitizeNavItems(form.config.items);
    const payload = { ...form, pageKey: filters.pageKey, title: form.title || null, subtitle: form.subtitle || null };
    rememberBeforeMutation();
    if (editingId.value) await api.patch(`/admin/homepage/sections/${editingId.value}`, payload, homepageScopeParams());
    else await api.post("/admin/homepage/sections", payload, homepageScopeParams());
    ElMessage.success(`已保存到「${saveScopeName.value}」，刷新前台预览即可查看最新效果`);
    captureFormSnapshot();
    editorOpen.value = false;
    drawer.value = false;
    load({ updateSnapshot: false });
  } finally {
    saving.value = false;
  }
}

async function closeDrawer(done?: () => void) {
  if (!hasEditorUnsavedChanges.value) {
    if (done) done();
    else {
      editorOpen.value = false;
      drawer.value = false;
    }
    return;
  }
  try {
    await ElMessageBox.confirm("当前模块有未保存修改，关闭后这些修改不会生效。确认关闭？", "未保存修改", {
      type: "warning",
      confirmButtonText: "确认关闭",
      cancelButtonText: "继续编辑"
    });
    captureFormSnapshot();
    if (done) done();
    else {
      editorOpen.value = false;
      drawer.value = false;
    }
  } catch {
    // Keep editing.
  }
}

async function saveOrder(nextRows: HomepageSectionView[]) {
  if (!canEdit.value) return;
  rememberBeforeMutation();
  const items = nextRows.map((item, index) => ({ id: item.id, sortOrder: (index + 1) * 10 }));
  rows.value = await api.put<any, HomepageSectionView[]>("/admin/homepage/sections/reorder", { items }, homepageScopeParams());
  ElMessage.success("排序已保存");
}

function move(row: HomepageSectionView, offset: number) {
  if (!canEdit.value) return;
  const list = orderedRows.value;
  const from = list.findIndex((item) => item.id === row.id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= list.length) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  saveOrder(list);
}

function onDragStart(row: HomepageSectionView) {
  if (!canEdit.value) return;
  draggedId.value = row.id;
}

function onDrop(target: HomepageSectionView) {
  if (!canEdit.value) return;
  const id = draggedId.value;
  draggedId.value = null;
  if (!id || id === target.id) return;
  const list = orderedRows.value;
  const from = list.findIndex((item) => item.id === id);
  const to = list.findIndex((item) => item.id === target.id);
  if (from < 0 || to < 0) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  saveOrder(list);
}

async function resetDefault() {
  if (!canEdit.value) return;
  await ElMessageBox.confirm(`恢复默认装修会替换「${currentPageOption.value.label}」当前范围的全部模块配置，确认继续？`, "恢复默认装修", { type: "warning" });
  rememberBeforeMutation();
  rows.value = await api.post<any, HomepageSectionView[]>("/admin/homepage/sections/reset-default", {}, homepageScopeParams());
  ElMessage.success("已恢复默认装修");
}

function templatePayload(row: TemplateRow, index: number) {
  return {
    pageKey: filters.pageKey,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle || "",
    enabled: row.enabled !== false,
    sortOrder: (index + 1) * 10,
    config: cloneJson(row.config || defaultConfig[row.type] || {}),
    layout: cloneJson(row.layout || defaultLayout[row.type] || {})
  };
}

function withHomeGlobalRows(nextRows: TemplateRow[]) {
  if (filters.pageKey !== "home") return nextRows;
  const rows = [...nextRows];
  for (const type of ["bottom_nav", "my_page", "inner_pages"]) {
    if (!rows.some((row) => row.type === type)) rows.push({ type, title: type === "bottom_nav" ? "前台底部导航" : type === "my_page" ? "我的活动" : "内页布局", config: defaultConfig[type], layout: defaultLayout[type], enabled: true });
  }
  return rows;
}

async function replaceCurrentSections(nextRows: TemplateRow[] | HomepageSectionView[], message: string, options: { updateSnapshot?: boolean; skipBeforeSnapshot?: boolean } = {}) {
  if (!canEdit.value) return;
  if (!options.skipBeforeSnapshot) rememberBeforeMutation();
  for (const row of orderedRows.value) await api.delete(`/admin/homepage/sections/${row.id}`, homepageScopeParams());
  const saved: HomepageSectionView[] = [];
  for (const [index, row] of nextRows.entries()) {
    const payload = "id" in row
      ? {
          pageKey: filters.pageKey,
          type: row.type,
          title: row.title,
          subtitle: row.subtitle || "",
          enabled: row.enabled,
          sortOrder: (index + 1) * 10,
          config: cloneJson(row.config || {}),
          layout: cloneJson(row.layout || {})
        }
      : templatePayload(row, index);
    saved.push(await api.post<any, HomepageSectionView>("/admin/homepage/sections", payload, homepageScopeParams()));
  }
  rows.value = saved;
  if (options.updateSnapshot) {
    lastPublishedRows.value = cloneJson(saved);
    lastPublishedLoaded.value = true;
  }
  ElMessage.success(message);
}

async function applyTemplate() {
  const template = decorationTemplates.find((item) => item.key === selectedTemplateKey.value) || decorationTemplates[0];
  await ElMessageBox.confirm(`应用「${template.label}」会替换当前页面模块，确认继续？`, "应用装修模板", { type: "warning" });
  await replaceCurrentSections(withHomeGlobalRows(template.rows), `已应用「${template.label}」`);
}

function uiKitStyle(kit: UiTemplateKit) {
  return cloneJson(visualPresets.find((item) => item.key === kit.stylePresetKey)?.layout || {}) as Record<string, any>;
}

function templateRowsToPreviewRows(templateRows: TemplateRow[]) {
  return withHomeGlobalRows(templateRows).map((row, index) => {
    const config = { ...cloneJson(defaultConfig[row.type] || {}), ...cloneJson(row.config || {}) };
    const layout = { ...cloneJson(defaultLayout[row.type] || {}), ...cloneJson(row.layout || {}) };
    return previewRow(index, row.type, {
      title: row.title === null ? null : row.title || typeLabel(row.type),
      subtitle: row.subtitle || null,
      enabled: row.enabled !== false,
      sortOrder: (index + 1) * 10,
      config,
      layout
    });
  }).filter((row) => row.enabled);
}

function openUiKitDialog() {
  uiKitPreviewKey.value = uiKitPreviewKey.value || selectedTemplateKey.value || uiTemplateKits[0]?.key || "activity_ops";
  uiKitDialogVisible.value = true;
}

function previewUiTemplateKit(kit: UiTemplateKit) {
  uiKitPreviewKey.value = kit.key;
}

async function applyUiTemplateKit(kit: UiTemplateKit) {
  await ElMessageBox.confirm(`应用「${kit.label}」会替换当前页面模块。建议先点“保存版本”保留当前装修，确认继续？`, "应用 UI 模板套装", { type: "warning" });
  uiKitApplyingKey.value = kit.key;
  try {
    await replaceCurrentSections(withHomeGlobalRows(kit.rows), `已应用「${kit.label}」`);
    uiKitDialogVisible.value = false;
  } finally {
    uiKitApplyingKey.value = "";
  }
}

async function applyUiTemplateStyle(kit: UiTemplateKit) {
  if (!orderedRows.value.length) return ElMessage.warning("当前页面没有模块，无法只套用视觉风格");
  await ElMessageBox.confirm(`只套用「${kit.label}」的颜色、卡片和按钮风格，不改变模块内容和顺序，确认继续？`, "套用视觉风格", { type: "info" });
  rememberBeforeMutation();
  uiKitApplyingKey.value = `${kit.key}:style`;
  try {
    const style = uiKitStyle(kit);
    const saved: HomepageSectionView[] = [];
    for (const row of orderedRows.value) {
      const layout = { ...(row.layout || {}), ...style };
      if (row.type === "bottom_nav") {
        layout.activeColor = style.primaryColor || row.layout?.activeColor;
        layout.textColor = style.mutedColor || row.layout?.textColor;
        layout.backgroundColor = style.surfaceColor || style.backgroundColor || row.layout?.backgroundColor;
      }
      if (row.type === "hero") {
        layout.backgroundColor = row.layout?.backgroundColor || style.backgroundColor;
      }
      saved.push(await api.patch<any, HomepageSectionView>(`/admin/homepage/sections/${row.id}`, {
        pageKey: filters.pageKey,
        type: row.type,
        title: row.title,
        subtitle: row.subtitle || "",
        enabled: row.enabled,
        sortOrder: row.sortOrder,
        config: cloneJson(row.config || {}),
        layout
      }, homepageScopeParams()));
    }
    rows.value = saved.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    ElMessage.success(`已套用「${kit.label}」视觉风格`);
  } finally {
    uiKitApplyingKey.value = "";
  }
}

async function restoreLastPublished() {
  if (!lastPublishedLoaded.value) return ElMessage.warning("当前没有可恢复的发布快照，请先刷新页面");
  await ElMessageBox.confirm("恢复后会撤销本次刷新后的模块调整，确认继续？", "恢复上次发布版本", { type: "warning" });
  await replaceCurrentSections(lastPublishedRows.value, "已恢复到上次发布版本", { updateSnapshot: true, skipBeforeSnapshot: true });
  clearRestoreSnapshot();
  lastPublishedRows.value = cloneJson(rows.value);
  lastPublishedLoaded.value = true;
}

function acceptServerRows(nextRows: HomepageSectionView[], options: { clearRestore?: boolean; updateSnapshot?: boolean } = {}) {
  rows.value = nextRows;
  if (options.updateSnapshot !== false) {
    lastPublishedRows.value = cloneJson(nextRows);
    lastPublishedLoaded.value = true;
  }
  if (options.clearRestore !== false) clearRestoreSnapshot();
}

async function loadVersions() {
  versionLoading.value = true;
  try {
    versions.value = await api.get<any, DecorationVersion[]>("/admin/homepage/versions", homepageScopeParams());
  } finally {
    versionLoading.value = false;
  }
}

async function openVersionHistory() {
  versionDialogVisible.value = true;
  await loadVersions();
}

async function saveVersion() {
  if (!canEdit.value) return;
  const defaultNote = `${templateDefaultName.value} ${formatSnapshotTime(new Date().toISOString())}`;
  try {
    const result = await ElMessageBox.prompt("给这个版本写一句备注，方便以后回滚时识别。", "保存当前装修版本", {
      inputValue: defaultNote,
      inputPlaceholder: "例如：上线前版本 / 节日活动改版前",
      confirmButtonText: "保存版本",
      cancelButtonText: "取消",
      inputValidator: (value) => Boolean(String(value || "").trim()) || "请输入版本备注"
    });
    versionSaving.value = true;
    await api.post("/admin/homepage/versions", { note: String(result.value || defaultNote).trim() }, homepageScopeParams());
    ElMessage.success("当前装修版本已保存");
    if (versionDialogVisible.value) await loadVersions();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") throw error;
  } finally {
    versionSaving.value = false;
  }
}

async function restoreVersion(version: DecorationVersion) {
  await ElMessageBox.confirm(`确认恢复「${version.note || version.name || `版本 ${version.id}`}」？当前页面模块会被这个版本替换。`, "恢复装修版本", {
    type: "warning",
    confirmButtonText: "确认恢复",
    cancelButtonText: "取消"
  });
  versionRestoringId.value = version.id;
  try {
    const nextRows = await api.post<any, HomepageSectionView[]>(`/admin/homepage/versions/${version.id}/restore`, {}, homepageScopeParams());
    acceptServerRows(nextRows);
    await loadVersions();
    ElMessage.success("已恢复到选中版本");
  } finally {
    versionRestoringId.value = null;
  }
}

async function deleteVersion(version: DecorationVersion) {
  await ElMessageBox.confirm("删除后不能从版本历史中找回，确认删除？", "删除装修版本", { type: "warning" });
  versionDeletingId.value = version.id;
  try {
    await api.delete(`/admin/homepage/versions/${version.id}`, homepageScopeParams());
    versions.value = versions.value.filter((item) => item.id !== version.id);
    ElMessage.success("版本已删除");
  } finally {
    versionDeletingId.value = null;
  }
}

function seedTemplateForm() {
  if (!templateForm.name.trim()) templateForm.name = templateDefaultName.value;
  if (!templateForm.category.trim()) templateForm.category = "运营模板";
}

async function loadSavedTemplates() {
  templateLoading.value = true;
  try {
    savedTemplates.value = await api.get<any, DecorationTemplate[]>("/admin/homepage/templates", homepageScopeParams());
  } finally {
    templateLoading.value = false;
  }
}

async function openTemplateLibrary() {
  seedTemplateForm();
  templateDialogVisible.value = true;
  await loadSavedTemplates();
}

async function saveCurrentAsTemplate() {
  if (!orderedRows.value.length) return ElMessage.warning("当前页面没有模块，不能保存为模板");
  seedTemplateForm();
  templateDialogVisible.value = true;
  await loadSavedTemplates();
}

async function saveTemplate() {
  if (!templateForm.name.trim()) return ElMessage.warning("请输入模板名称");
  if (!orderedRows.value.length) return ElMessage.warning("当前页面没有模块，不能保存为模板");
  templateSaving.value = true;
  try {
    await api.post("/admin/homepage/templates", {
      name: templateForm.name.trim(),
      category: templateForm.category.trim(),
      description: templateForm.description.trim()
    }, homepageScopeParams());
    ElMessage.success("模板已保存");
    templateForm.name = "";
    templateForm.description = "";
    seedTemplateForm();
    await loadSavedTemplates();
  } finally {
    templateSaving.value = false;
  }
}

async function applySavedTemplate(template: DecorationTemplate) {
  await ElMessageBox.confirm(`应用「${template.name}」会替换当前页面模块，确认继续？`, "应用模板库模板", {
    type: "warning",
    confirmButtonText: "确认应用",
    cancelButtonText: "取消"
  });
  templateApplyingId.value = template.id;
  try {
    rememberBeforeMutation();
    const nextRows = await api.post<any, HomepageSectionView[]>(`/admin/homepage/templates/${template.id}/apply`, {}, homepageScopeParams());
    acceptServerRows(nextRows, { clearRestore: false, updateSnapshot: false });
    ElMessage.success(`已应用「${template.name}」`);
  } finally {
    templateApplyingId.value = null;
  }
}

function canDeleteSavedTemplate(template: DecorationTemplate) {
  return isPlatformAdmin() || Boolean(template.tenant?.id);
}

async function deleteSavedTemplate(template: DecorationTemplate) {
  await ElMessageBox.confirm(`确认删除模板「${template.name}」？`, "删除装修模板", { type: "warning" });
  templateDeletingId.value = template.id;
  try {
    await api.delete(`/admin/homepage/templates/${template.id}`, homepageScopeParams());
    savedTemplates.value = savedTemplates.value.filter((item) => item.id !== template.id);
    ElMessage.success("模板已删除");
  } finally {
    templateDeletingId.value = null;
  }
}

function templateScopeLabel(template: DecorationTemplate) {
  if (!template.tenant?.id) return "平台模板";
  return template.tenant.name || template.tenant.code || "商家模板";
}

async function copyFromPage() {
  if (!copyFromPageKey.value || copyFromPageKey.value === filters.pageKey) return ElMessage.warning("请选择另一个页面作为复制来源");
  const source = await api.get<any, HomepageSectionView[]>("/admin/homepage/sections", {
    params: { ...homepageScopeParams().params, pageKey: copyFromPageKey.value }
  });
  if (!source.length) return ElMessage.warning("来源页面暂无模块");
  await ElMessageBox.confirm(`将「${pageOptions.find((item) => item.key === copyFromPageKey.value)?.label || copyFromPageKey.value}」复制到当前页面，确认替换？`, "复制页面配置", { type: "warning" });
  await replaceCurrentSections(source, "页面配置已复制");
}

function openCrossTenantCopy() {
  if (!isPlatformAdmin()) return;
  const currentTenantId = filters.tenantId || tenants.value[0]?.id;
  const sourceTenant = tenants.value.find((tenant) => tenant.id !== currentTenantId) || tenants.value[0];
  crossCopyForm.mode = "current_page";
  crossCopyForm.sourceTenantId = sourceTenant?.id;
  crossCopyForm.targetTenantId = currentTenantId;
  crossCopyForm.sourcePageKey = filters.pageKey;
  crossCopyForm.targetPageKey = filters.pageKey;
  crossCopyResult.value = "";
  crossCopyDialogVisible.value = true;
}

function validateCrossTenantCopy() {
  if (!isPlatformAdmin()) return "只有平台超管可以跨商家复制装修";
  if (!crossCopyForm.sourceTenantId) return "请选择来源商家";
  if (!crossCopyForm.targetTenantId) return "请选择目标商家";
  if (crossCopyForm.sourceTenantId === crossCopyForm.targetTenantId) return "来源商家和目标商家不能相同；同一商家内复制请使用“复制页面配置”";
  if (crossCopyForm.mode === "current_page" && !crossCopyForm.sourcePageKey) return "请选择来源页面";
  if (crossCopyForm.mode === "current_page" && !crossCopyForm.targetPageKey) return "请选择目标页面";
  return "";
}

async function replaceSectionsForTenant(tenantId: number, pageKey: string, sourceRows: HomepageSectionView[]) {
  const params = homepageParamsFor(tenantId, pageKey);
  const currentRows = await api.get<any, HomepageSectionView[]>("/admin/homepage/sections", params);
  for (const row of currentRows) await api.delete(`/admin/homepage/sections/${row.id}`, params);
  for (const [index, row] of sourceRows.entries()) {
    await api.post("/admin/homepage/sections", sectionCopyPayload(row, pageKey, index), params);
  }
}

async function executeCrossTenantCopy() {
  const validation = validateCrossTenantCopy();
  if (validation) return ElMessage.warning(validation);
  const sourceTenantId = Number(crossCopyForm.sourceTenantId);
  const targetTenantId = Number(crossCopyForm.targetTenantId);
  const pairs = crossCopyForm.mode === "all_pages"
    ? pageOptions.map((page) => ({ sourcePageKey: page.key, targetPageKey: page.key, label: page.label }))
    : [{
        sourcePageKey: crossCopyForm.sourcePageKey,
        targetPageKey: crossCopyForm.targetPageKey,
        label: pageOptions.find((page) => page.key === crossCopyForm.sourcePageKey)?.label || crossCopyForm.sourcePageKey
      }];
  const confirmMessage = crossCopyForm.mode === "all_pages"
    ? `确认将「${crossCopySourceTenantName.value}」已有装修模块的页面复制到「${crossCopyTargetTenantName.value}」？目标商家的对应页面会被替换。`
    : `确认执行跨商家复制？${crossCopyPlanText.value}目标页面当前模块会被替换。`;
  await ElMessageBox.confirm(confirmMessage, "跨商家复制", {
    type: "warning",
    confirmButtonText: "确认复制",
    cancelButtonText: "取消"
  });
  crossCopySubmitting.value = true;
  crossCopyResult.value = "";
  try {
    let copiedPages = 0;
    let skippedPages = 0;
    let copiedModules = 0;
    for (const pair of pairs) {
      const sourceRows = await api.get<any, HomepageSectionView[]>("/admin/homepage/sections", homepageParamsFor(sourceTenantId, pair.sourcePageKey));
      if (!sourceRows.length) {
        skippedPages += 1;
        continue;
      }
      await replaceSectionsForTenant(targetTenantId, pair.targetPageKey, sourceRows);
      copiedPages += 1;
      copiedModules += sourceRows.length;
    }
    if (!copiedPages) {
      crossCopyResult.value = "来源商家选定页面没有装修模块，本次没有复制。";
      return ElMessage.warning(crossCopyResult.value);
    }
    const targetIsCurrentScope = filters.tenantId === targetTenantId && (crossCopyForm.mode === "all_pages" || crossCopyForm.targetPageKey === filters.pageKey);
    if (targetIsCurrentScope) await load({ updateSnapshot: false });
    crossCopyResult.value = `已复制 ${copiedPages} 个页面、${copiedModules} 个模块${skippedPages ? `；跳过 ${skippedPages} 个空页面` : ""}。`;
    ElMessage.success(crossCopyResult.value);
  } finally {
    crossCopySubmitting.value = false;
  }
}

async function uploadImage(file: File, field: string) {
  const data = new FormData();
  data.append("file", file);
  const result = await api.post<any, any>("/admin/uploads/images", data, { headers: { "Content-Type": "multipart/form-data" } });
  form.config[field] = result.url || result.path;
  syncJsonText();
  ElMessage.success("图片已上传");
  return false;
}

async function uploadLayoutImage(file: File) {
  const data = new FormData();
  data.append("file", file);
  const result = await api.post<any, any>("/admin/uploads/images", data, { headers: { "Content-Type": "multipart/form-data" } });
  form.layout.backgroundImage = result.url || result.path;
  syncJsonText();
  ElMessage.success("背景图已上传");
  return false;
}

async function uploadConfigArrayItemImage(file: File, arrayKey: "items" | "tools", index: number, key: string) {
  const data = new FormData();
  data.append("file", file);
  const result = await api.post<any, any>("/admin/uploads/images", data, { headers: { "Content-Type": "multipart/form-data" } });
  updateConfigArrayItem(arrayKey, index, key, result.url || result.path);
  ElMessage.success("图标已上传");
  return false;
}

function onTypeChange(value: string | number | boolean) {
  resetForm(String(value));
}

function uploadHeroBackground(file: File) {
  return uploadImage(file, "backgroundImage");
}

function uploadBannerImage(file: File) {
  return uploadImage(file, "imageUrl");
}

function uploadRichTextImage(file: File) {
  return uploadImage(file, "imageUrl");
}

function updateQuickItem(index: number, key: string, value: string) {
  const items = Array.isArray(form.config.items) ? form.config.items : [];
  items[index] = { ...(items[index] || {}), [key]: value };
  form.config.items = items;
  syncJsonText();
}

function updateQuickLabel(index: number, value: string | number) {
  updateQuickItem(index, "label", String(value));
}

function updateQuickLink(index: number, value: string | number) {
  updateQuickItem(index, "link", String(value));
}

function updateQuickColor(index: number, value: string | null) {
  updateQuickItem(index, "color", String(value || "#0f766e"));
}

function addQuickItem() {
  form.config.items = [...(Array.isArray(form.config.items) ? form.config.items : []), { label: "新入口", icon: "activity", color: "#0f766e", link: "/pages/activity/list" }];
  syncJsonText();
}

function removeQuickItem(index: number) {
  form.config.items = (Array.isArray(form.config.items) ? form.config.items : []).filter((_, itemIndex) => itemIndex !== index);
  syncJsonText();
}

function updateConfigArrayItem(arrayKey: "items" | "tools", index: number, key: string, value: string) {
  const items = Array.isArray(form.config[arrayKey]) ? form.config[arrayKey] : [];
  items[index] = { ...(items[index] || {}), [key]: value };
  form.config[arrayKey] = items;
  syncJsonText();
}

function updateConfigArrayItemBoolean(arrayKey: "items" | "tools", index: number, key: string, value: boolean) {
  const items = Array.isArray(form.config[arrayKey]) ? form.config[arrayKey] : [];
  items[index] = { ...(items[index] || {}), [key]: value };
  form.config[arrayKey] = items;
  syncJsonText();
}

function removeConfigArrayItem(arrayKey: "items" | "tools" | "pages", index: number) {
  form.config[arrayKey] = (Array.isArray(form.config[arrayKey]) ? form.config[arrayKey] : []).filter((_, itemIndex) => itemIndex !== index);
  syncJsonText();
}

function addNavItem() {
  const items = Array.isArray(form.config.items) ? form.config.items : [];
  if (items.length >= 5) {
    ElMessage.warning("前台底部导航最多 5 项");
    return;
  }
  form.config.items = [...(Array.isArray(form.config.items) ? form.config.items : []), { label: "新菜单", icon: "新", activeIcon: "新", color: "#C43D3D", link: "/pages/index/index", action: "mainPage", enabled: true }];
  syncJsonText();
}

function sanitizeNavItems(value: unknown) {
  const seen = new Set<string>();
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((item: any) => ({
      ...item,
      label: String(item?.label || "").trim(),
      icon: String(item?.icon || "").trim(),
      activeIcon: String(item?.activeIcon || "").trim(),
      link: String(item?.link || "").trim(),
      action: String(item?.action || "mainPage").trim(),
      enabled: item?.enabled !== false
    }))
    .filter((item: any) => item.label && item.link && !seen.has(item.link) && seen.add(item.link))
    .slice(0, 5);
}

function addMyTool() {
  form.config.tools = [...(Array.isArray(form.config.tools) ? form.config.tools : []), { label: "新入口", icon: "入", color: "#0f766e", link: "/pages/activity/list" }];
  syncJsonText();
}

function updateInnerPage(index: number, key: string, value: string | boolean) {
  const pages = Array.isArray(form.config.pages) ? form.config.pages : [];
  pages[index] = { ...(pages[index] || {}), [key]: value };
  form.config.pages = pages;
  syncJsonText();
}

function addInnerPage() {
  form.config.pages = [...(Array.isArray(form.config.pages) ? form.config.pages : []), { key: "custom_page", title: "新内页", subtitle: "", showBottomNav: true }];
  syncJsonText();
}

function tenantDisplayName(row: any) {
  return row.tenant?.name || row.tenant?.code || "平台/未归属";
}

function tenantOptionLabel(tenant: any) {
  return `${tenant.name || tenant.code}（${tenant.code}）`;
}

async function copyH5PreviewUrl() {
  await copyToClipboard(previewUrl.value);
  ElMessage.success("H5 预览链接已复制");
}

async function openCurrentPreview() {
  await copyToClipboard(previewUrl.value);
  const opened = window.open(previewUrl.value, "_blank", "noopener,noreferrer");
  if (opened) ElMessage.success("已打开预览，并复制预览链接");
  else ElMessage.warning("浏览器阻止了新窗口，预览链接已复制");
}

onMounted(async () => {
  applyRouteFilters();
  await loadTenants();
  if (isPlatformAdmin() && filters.tenantId && !tenants.value.some((tenant) => tenant.id === filters.tenantId)) {
    filters.tenantId = undefined;
  }
  syncRouteFilters();
  await load();
});
</script>

<template>
  <div class="builder-page">
    <div class="builder-toolbar">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>{{ pageDescription }}</p>
      </div>
      <div class="toolbar-actions">
        <el-select v-model="filters.pageKey" filterable placeholder="选择页面" style="width: 180px" @change="handleScopeChanged">
          <el-option v-for="page in pageOptions" :key="page.key" :label="page.label" :value="page.key" />
        </el-select>
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width: 220px" @change="handleScopeChanged">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-button :icon="View" @click="openCurrentPreview">发布前预览</el-button>
        <el-button :icon="CopyDocument" @click="copyH5PreviewUrl">复制链接</el-button>
        <el-button type="warning" plain @click="runHealthCheck">生效检测</el-button>
        <el-select v-if="canEdit" v-model="selectedTemplateKey" placeholder="装修模板" style="width: 150px">
          <el-option v-for="item in decorationTemplates" :key="item.key" :label="item.label" :value="item.key" />
        </el-select>
        <el-button v-if="canEdit" type="success" @click="applyTemplate">应用模板</el-button>
        <el-button v-if="canEdit" type="warning" plain @click="openUiKitDialog">UI 模板套装</el-button>
        <el-button v-if="canEdit" type="primary" plain :loading="versionSaving" @click="saveVersion">保存版本</el-button>
        <el-button v-if="canEdit" @click="openVersionHistory">版本历史</el-button>
        <el-button v-if="canEdit" type="success" plain @click="saveCurrentAsTemplate">保存为模板</el-button>
        <el-button v-if="canEdit" @click="openTemplateLibrary">模板库</el-button>
        <el-select v-if="canEdit" v-model="copyFromPageKey" placeholder="复制来源" style="width: 150px">
          <el-option v-for="page in pageOptions" :key="page.key" :label="page.label" :value="page.key" />
        </el-select>
        <el-button v-if="canEdit" @click="copyFromPage">复制页面配置</el-button>
        <el-button v-if="isPlatformAdmin()" :icon="CopyDocument" @click="openCrossTenantCopy">跨商家复制</el-button>
        <el-button v-if="canEdit" @click="restoreLastPublished">恢复上次发布版本</el-button>
        <el-button v-if="canEdit" :icon="Refresh" @click="resetDefault">恢复默认装修</el-button>
        <el-button :icon="QuestionFilled" @click="helpDialogVisible = true">装修教程</el-button>
        <el-button type="primary" @click="load">刷新</el-button>
      </div>
    </div>

    <div class="preview-link">
      <strong>{{ previewScopeName }}</strong>
      <span>{{ previewUrl }}</span>
      <small>模块保存后前台生效；未保存内容可先查看右侧手机预览或抽屉实时预览。{{ restoreSnapshotHint }}</small>
    </div>

    <div v-if="scopeTip" class="scope-tip" :class="{ muted: isPlatformAdmin() && filters.tenantId }">{{ scopeTip }}</div>

    <el-dialog v-model="uiKitDialogVisible" title="UI 模板套装" width="1180px" destroy-on-close>
      <div class="ui-kit-dialog-body">
        <div class="ui-kit-grid">
          <article
            v-for="kit in uiTemplateKits"
            :key="kit.key"
            class="ui-kit-card"
            :class="{ featured: kit.key === 'wuxing_gold_business', active: selectedUiTemplateKit?.key === kit.key }"
            @click="previewUiTemplateKit(kit)"
          >
            <div class="ui-kit-preview" :style="{ background: `linear-gradient(135deg, ${kit.palette[0]} 0%, ${kit.palette[1] || kit.palette[0]} 100%)` }">
              <div class="ui-kit-phone-card" :style="{ background: kit.palette[2] || '#fff', color: kit.palette[4] || kit.palette[0] }">
                <strong>{{ kit.label }}</strong>
                <span>{{ kit.scene }}</span>
                <div class="ui-kit-mini-grid">
                  <i v-for="color in kit.palette.slice(0, 4)" :key="color" :style="{ background: color }"></i>
                </div>
              </div>
            </div>
            <div class="ui-kit-body">
              <div class="ui-kit-title-row">
                <strong>{{ kit.label }}</strong>
                <el-tag size="small" :type="kit.key === 'wuxing_gold_business' ? 'warning' : 'info'">{{ kit.category }}</el-tag>
              </div>
              <p>{{ kit.description }}</p>
              <div class="ui-kit-palette">
                <span v-for="color in kit.palette" :key="color" :style="{ background: color }" :title="color"></span>
              </div>
              <div class="ui-kit-meta">{{ kit.rows.length }} 个模块 · {{ kit.scene }}</div>
              <div class="ui-kit-actions">
                <el-button size="small" plain @click.stop="previewUiTemplateKit(kit)">预览</el-button>
                <el-button size="small" type="primary" :loading="uiKitApplyingKey === kit.key" @click.stop="applyUiTemplateKit(kit)">应用整套模板</el-button>
                <el-button size="small" plain :loading="uiKitApplyingKey === `${kit.key}:style`" @click.stop="applyUiTemplateStyle(kit)">只套视觉风格</el-button>
              </div>
            </div>
          </article>
        </div>
        <aside class="ui-kit-live-preview">
          <div class="ui-kit-live-preview-head">
            <div>
              <strong>{{ selectedUiTemplateKit?.label || "模板预览" }}</strong>
              <span>{{ selectedUiTemplateKit?.scene || "点击模板卡片或预览按钮切换" }}</span>
            </div>
            <el-tag size="small" type="warning" effect="plain">实时预览</el-tag>
          </div>
          <div class="phone-frame ui-kit-phone-frame">
            <div class="phone-status"></div>
            <div class="preview-scroll">
              <div v-for="row in uiKitPreviewRows" :key="row.id" class="preview-row-shell fallback" :class="{ focused: row.id === uiKitPreviewRows[0]?.id }">
                <div v-if="row.type === 'search_bar'" class="preview-search">
                  <span>{{ (row.config as any).cityLabel || "本地" }}</span>
                  <b>{{ (row.config as any).placeholder || "搜索活动" }}</b>
                </div>
                <div v-else-if="row.type === 'hero'" class="preview-hero" :style="previewHeroStyle(row)">
                  <small :style="{ opacity: clampPercent((row.config as any).textOpacity, 100) / 100 }">{{ (row.config as any).eyebrow || "慢π活动运营" }}</small>
                  <h4 :style="{ opacity: clampPercent((row.config as any).titleOpacity, 100) / 100 }">{{ row.title }}</h4>
                  <p :style="{ opacity: clampPercent((row.config as any).subtitleOpacity, 86) / 100 }">{{ row.subtitle }}</p>
                  <div v-if="(row.config as any).primaryButtonText" class="preview-hero-button" :style="{ background: rgba('#ffffff', (row.config as any).buttonOpacity, 18) }">{{ (row.config as any).primaryButtonText }}</div>
                  <div v-if="(row.config as any).showStats !== false" class="preview-hero-stats">
                    <span :style="{ background: rgba('#ffffff', (row.config as any).statsOpacity, 14) }">9<br />报名中</span>
                    <span :style="{ background: rgba('#ffffff', (row.config as any).statsOpacity, 14) }">10<br />全部活动</span>
                  </div>
                </div>
                <div v-else-if="row.type === 'quick_nav'" class="preview-grid">
                  <span v-for="item in ((row.config as any).items || []).slice(0, 4)" :key="item.label">{{ item.label }}</span>
                </div>
                <div v-else-if="row.type === 'image_banner'" class="preview-banner">
                  <img v-if="(row.config as any).imageUrl" :src="(row.config as any).imageUrl" />
                  <span v-else>图片 Banner</span>
                </div>
                <div v-else-if="row.type === 'bottom_nav'" class="preview-bottom-nav" :style="{ '--preview-nav-count': previewNavCount(row) }">
                  <span v-for="item in enabledNavItems(row)" :key="item.label">
                    <b>{{ item.icon || item.label?.slice(0, 1) }}</b>{{ item.label }}
                  </span>
                </div>
                <div v-else-if="row.type === 'my_page'" class="preview-my" :style="{ background: String((row.layout as any).heroBackgroundColor || '#111827'), color: String((row.layout as any).heroTextColor || '#ffffff') }">
                  <strong>{{ (row.config as any).greeting || row.title || "我的活动" }}</strong>
                  <span v-for="item in ((row.config as any).tools || []).slice(0, 4)" :key="item.label">{{ item.label }}</span>
                </div>
                <div v-else-if="row.type === 'inner_pages'" class="preview-inner-pages">
                  <strong>{{ row.title || "内页布局" }}</strong>
                  <span v-for="item in ((row.config as any).pages || []).slice(0, 4)" :key="item.key">{{ item.title }}</span>
                </div>
                <div v-else class="preview-section" :style="previewSectionStyle(row)">
                  <strong>{{ row.title || typeLabel(row.type) }}</strong>
                  <span>{{ typeLabel(row.type) }}</span>
                </div>
              </div>
            </div>
          </div>
          <el-alert type="warning" :closable="false" show-icon title="这里是实时模板预览，不会保存数据。可先切换模板查看整体排版，再决定是否应用。">
            <template #default>
              <div class="ui-kit-preview-note">选中的模板仅用于预览；点击“应用整套模板”才会替换当前页面模块。</div>
            </template>
          </el-alert>
        </aside>
      </div>
      <template #footer>
        <el-alert type="warning" show-icon :closable="false" title="应用整套模板会替换当前页面模块；正式页面建议先保存版本。只套视觉风格不会改变当前模块顺序和内容。" />
      </template>
    </el-dialog>

    <el-dialog v-model="helpDialogVisible" title="后台装修使用教程" width="760px">
      <div class="builder-help">
        <section>
          <h3>这块是做什么的</h3>
          <p>后台装修用来控制前台 H5/小程序的页面模块、顺序、文案、图片、按钮和底部导航。保存后，用户端刷新页面就会按这里的配置展示。</p>
        </section>
        <section>
          <h3>推荐操作顺序</h3>
          <ol>
            <li>先在左上角选择要装修的页面。</li>
            <li>平台超管先确认装修范围：不选商家是平台默认装修，选中商家是该商家的独立装修。</li>
            <li>点击模块行编辑文案、图片、按钮链接和显示状态。</li>
            <li>用右侧手机预览或“发布前预览”检查效果。</li>
            <li>确认无误后保存模块，复制链接到手机微信里再看一次。</li>
          </ol>
        </section>
        <section>
          <h3>红框工具条说明</h3>
          <div class="builder-help-grid">
            <article v-for="item in toolbarHelpItems" :key="item.title">
              <strong>{{ item.title }}</strong>
              <span>{{ item.text }}</span>
            </article>
          </div>
        </section>
        <section class="builder-help-warning">
          <h3>容易误操作的地方</h3>
          <p>“应用模板”“复制页面配置”“恢复默认装修”都会替换当前页面模块。正式运营页面建议先点“发布前预览”或保留当前配置截图，再执行这些动作。</p>
        </section>
      </div>
    </el-dialog>

    <el-dialog v-model="healthDialogVisible" title="装修生效检测" width="760px">
      <div class="health-dialog">
        <el-alert
          :type="healthIssues.some((item) => item.level === 'error') ? 'error' : healthIssues.length ? 'warning' : 'success'"
          show-icon
          :closable="false"
          :title="healthIssues.length ? `检测完成：${healthSummary}` : '检测通过：当前页面没有发现明显装修生效问题'"
        />
        <div v-if="!healthIssues.length" class="health-empty">
          当前页面模块、链接、图片和 H5/小程序兼容性没有发现明显风险。保存后 H5 刷新即可验证，小程序仍需重新构建或上传最新版。
        </div>
        <div v-else class="health-list">
          <article v-for="(issue, index) in healthIssues" :key="index" class="health-item" :class="issue.level">
            <el-tag :type="issueType(issue.level)" size="small">{{ issue.level === "error" ? "错误" : "提醒" }}</el-tag>
            <div>
              <strong>{{ issue.title }}</strong>
              <p>{{ issue.detail }}</p>
            </div>
            <el-button v-if="issue.sectionId" size="small" link type="primary" @click="editIssueSection(issue)">定位模块</el-button>
          </article>
        </div>
      </div>
      <template #footer>
        <el-button @click="healthDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="versionDialogVisible" title="装修版本历史" width="820px" destroy-on-close>
      <div class="version-dialog" v-loading="versionLoading">
        <el-alert
          type="info"
          show-icon
          :closable="false"
          :title="`${templateDefaultName} · 当前最多展示最近 30 个版本`"
        />
        <div v-if="!versions.length" class="version-empty">
          当前页面还没有保存过数据库版本。点击“保存版本”后，后续可以在这里一键恢复。
        </div>
        <div v-else class="version-list">
          <article v-for="version in versions" :key="version.id" class="version-item">
            <div>
              <strong>{{ version.note || version.name || `版本 ${version.id}` }}</strong>
              <span>{{ formatSnapshotTime(version.createdAt) }} · {{ version.sectionCount }} 个模块 · {{ version.createdByName || "system" }}</span>
            </div>
            <div class="version-actions">
              <el-button size="small" type="primary" plain :loading="versionRestoringId === version.id" @click="restoreVersion(version)">恢复</el-button>
              <el-button size="small" type="danger" plain :loading="versionDeletingId === version.id" @click="deleteVersion(version)">删除</el-button>
            </div>
          </article>
        </div>
      </div>
      <template #footer>
        <el-button @click="loadVersions">刷新</el-button>
        <el-button type="primary" plain :loading="versionSaving" @click="saveVersion">保存当前版本</el-button>
        <el-button @click="versionDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="templateDialogVisible" title="装修模板库" width="880px" destroy-on-close>
      <div class="template-dialog">
        <el-alert
          type="warning"
          show-icon
          :closable="false"
          title="应用模板会替换当前页面模块。正式运营页面建议先保存版本，再应用模板。"
        />
        <section class="template-save-box">
          <div class="template-save-head">
            <strong>保存当前页面为模板</strong>
            <span>{{ templateDefaultName }}</span>
          </div>
          <el-form label-position="top" class="template-save-form">
            <el-form-item label="模板名称" required>
              <el-input v-model="templateForm.name" placeholder="例如：慢π首页活动转化版" />
            </el-form-item>
            <el-form-item label="分类">
              <el-input v-model="templateForm.category" placeholder="运营模板 / 节日模板 / 商城模板" />
            </el-form-item>
            <el-form-item label="说明" class="template-description">
              <el-input v-model="templateForm.description" type="textarea" :rows="2" placeholder="说明适合什么页面、什么时候使用" />
            </el-form-item>
            <el-form-item class="template-save-action">
              <el-button type="primary" :loading="templateSaving" @click="saveTemplate">保存为模板</el-button>
            </el-form-item>
          </el-form>
        </section>
        <section class="template-list-box" v-loading="templateLoading">
          <div class="template-list-head">
            <strong>可用模板</strong>
            <el-button size="small" @click="loadSavedTemplates">刷新</el-button>
          </div>
          <div v-if="!savedTemplates.length" class="version-empty">
            暂无保存过的模板。可以先把当前页面保存为模板，后续复制到其他页面或商家时直接复用。
          </div>
          <div v-else class="template-list">
            <article v-for="template in savedTemplates" :key="template.id" class="template-item">
              <div>
                <strong>{{ template.name }}</strong>
                <span>{{ templateScopeLabel(template) }} · {{ template.category || "未分类" }} · {{ template.sectionCount }} 个模块 · {{ formatSnapshotTime(template.updatedAt || template.createdAt) }}</span>
                <p v-if="template.description">{{ template.description }}</p>
              </div>
              <div class="version-actions">
                <el-button size="small" type="primary" plain :loading="templateApplyingId === template.id" @click="applySavedTemplate(template)">应用</el-button>
                <el-button v-if="canDeleteSavedTemplate(template)" size="small" type="danger" plain :loading="templateDeletingId === template.id" @click="deleteSavedTemplate(template)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </div>
      <template #footer>
        <el-button @click="templateDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="linkPickerVisible" title="选择跳转链接" width="640px" destroy-on-close>
      <div class="link-picker">
        <el-alert
          type="info"
          show-icon
          :closable="false"
          :title="linkPicker.target ? `正在设置：${linkPicker.target.label}` : '选择链接'"
        />
        <el-radio-group v-model="linkPicker.mode">
          <el-radio-button value="page">系统页面</el-radio-button>
          <el-radio-button value="detail">详情页</el-radio-button>
          <el-radio-button value="external">外部 H5</el-radio-button>
        </el-radio-group>
        <el-form label-position="top">
          <el-form-item v-if="linkPicker.mode === 'page'" label="选择页面">
            <el-select v-model="linkPicker.pagePath" filterable style="width: 100%">
              <el-option-group v-for="group in linkPageGroups" :key="group" :label="group">
                <el-option v-for="item in linkPageOptions.filter((option) => option.group === group)" :key="item.path" :label="item.label" :value="item.path" />
              </el-option-group>
            </el-select>
          </el-form-item>
          <template v-if="linkPicker.mode === 'detail'">
            <el-form-item label="详情类型">
              <el-select v-model="linkPicker.detailType" style="width: 100%">
                <el-option v-for="item in detailLinkOptions" :key="item.type" :label="item.label" :value="item.type" />
              </el-select>
            </el-form-item>
            <el-form-item :label="detailLinkOptions.find((item) => item.type === linkPicker.detailType)?.idLabel || 'ID'">
              <el-input v-model="linkPicker.detailId" placeholder="输入后台列表里的 ID，系统会自动生成小程序路径" />
            </el-form-item>
          </template>
          <el-form-item v-if="linkPicker.mode === 'external'" label="外部 H5 链接">
            <el-input v-model="linkPicker.externalUrl" placeholder="https://example.com/path" />
          </el-form-item>
        </el-form>
        <div class="link-preview">
          <strong>将写入路径</strong>
          <span>{{ linkPickerPreviewValue }}</span>
          <small>运营只需要选择页面或填写 ID，不需要手写 `/pages/...` 路径。</small>
        </div>
      </div>
      <template #footer>
        <el-button @click="linkPickerVisible = false">取消</el-button>
        <el-button type="primary" @click="applyLinkPicker">应用链接</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="crossCopyDialogVisible" title="跨商家复制" width="760px" destroy-on-close>
      <div class="cross-copy-dialog">
        <el-alert
          type="warning"
          show-icon
          :closable="false"
          title="复制会替换目标商家对应页面的已有装修模块，建议先确认来源和目标不要选反。"
        />
        <el-form label-position="top" class="cross-copy-form">
          <el-form-item label="复制范围">
            <el-radio-group v-model="crossCopyForm.mode">
              <el-radio-button value="current_page">当前页面</el-radio-button>
              <el-radio-button value="all_pages">全部页面</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <div class="cross-copy-grid">
            <el-form-item label="来源商家" required>
              <el-select v-model="crossCopyForm.sourceTenantId" filterable placeholder="选择要复制的商家" style="width: 100%">
                <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="目标商家" required>
              <el-select v-model="crossCopyForm.targetTenantId" filterable placeholder="选择要覆盖的商家" style="width: 100%">
                <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
              </el-select>
            </el-form-item>
          </div>
          <div class="cross-copy-grid">
            <el-form-item label="来源页面" required>
              <el-select v-model="crossCopyForm.sourcePageKey" :disabled="crossCopyForm.mode === 'all_pages'" filterable style="width: 100%">
                <el-option v-for="page in pageOptions" :key="page.key" :label="page.label" :value="page.key" />
              </el-select>
            </el-form-item>
            <el-form-item label="目标页面" required>
              <el-select v-model="crossCopyForm.targetPageKey" :disabled="crossCopyForm.mode === 'all_pages'" filterable style="width: 100%">
                <el-option v-for="page in pageOptions" :key="page.key" :label="page.label" :value="page.key" />
              </el-select>
            </el-form-item>
          </div>
        </el-form>
        <div class="cross-copy-plan">
          <strong>复制计划</strong>
          <span>{{ crossCopyPlanText }}</span>
        </div>
        <el-alert v-if="crossCopyResult" type="success" show-icon :closable="false" :title="crossCopyResult" />
      </div>
      <template #footer>
        <el-button @click="crossCopyDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="crossCopySubmitting" @click="executeCrossTenantCopy">确认复制</el-button>
      </template>
    </el-dialog>

    <div class="builder-layout">
      <aside v-if="canEdit" class="module-palette">
        <h3>添加模块</h3>
        <button v-for="item in moduleTypes" :key="item.type" class="module-option" @click="addSection(item.type)">
          <span>{{ item.label }}</span>
          <small>{{ item.description }}</small>
        </button>
      </aside>

      <main class="section-list" v-loading="loading">
        <div class="list-head">
          <h3>{{ scopeTitle }}</h3>
          <span>{{ orderedRows.length }} 个模块</span>
        </div>
        <div v-if="!orderedRows.length" class="empty">暂无模块，点击左侧添加或恢复默认装修。</div>
        <div
          v-for="(row, index) in orderedRows"
          :key="row.id"
          class="section-row"
          :class="{ disabled: !row.enabled, active: editorOpen && editingId === row.id }"
          :draggable="canEdit"
          @dragstart="onDragStart(row)"
          @dragover.prevent
          @drop="onDrop(row)"
        >
          <div v-if="canEdit" class="drag-handle">::</div>
          <div class="section-main" @click="edit(row)">
            <div class="section-title">
              <strong>{{ row.title || typeLabel(row.type) }}</strong>
              <el-tag size="small">{{ typeLabel(row.type) }}</el-tag>
              <el-tag size="small" :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "显示" : "隐藏" }}</el-tag>
              <el-tag v-if="isPlatformAdmin()" size="small" type="info">{{ tenantDisplayName(row) }}</el-tag>
            </div>
            <p>{{ row.subtitle || "未设置副标题" }}</p>
          </div>
          <div v-if="canEdit" class="row-actions">
            <el-button size="small" @click="move(row, -1)" :disabled="index === 0">上移</el-button>
            <el-button size="small" @click="move(row, 1)" :disabled="index === orderedRows.length - 1">下移</el-button>
            <el-button size="small" @click="toggle(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
            <el-button size="small" :icon="CopyDocument" @click="copy(row)" />
            <el-button size="small" type="danger" :icon="Delete" @click="remove(row)" />
          </div>
        </div>
      </main>

      <aside class="phone-preview">
        <div class="preview-panel-head">
          <div>
            <strong>实时预览</strong>
            <span>编辑时同步更新，往下滚动也能一直看到当前布局。</span>
          </div>
          <div class="preview-panel-actions">
            <el-button size="small" type="warning" plain @click="runHealthCheck">生效检测</el-button>
            <el-button size="small" :icon="View" @click="openCurrentPreview">已保存H5</el-button>
          </div>
        </div>
        <div v-if="hasDefaultPreviewFallback" class="preview-fallback-tip">当前页面还没有保存模块，下面展示默认装修效果。</div>
        <div class="phone-frame">
          <div class="phone-status"></div>
          <div class="preview-scroll">
            <div v-for="row in previewRows" :key="row.id" class="preview-row-shell" :class="{ focused: isFocusedPreviewRow(row), fallback: hasDefaultPreviewFallback }" @click="selectPreviewRow(row)">
              <div v-if="row.type === 'search_bar'" class="preview-search">
                <span>{{ (row.config as any).cityLabel || "本地" }}</span>
                <b>{{ (row.config as any).placeholder || "搜索活动" }}</b>
              </div>
              <div v-else-if="row.type === 'hero'" class="preview-hero" :style="previewHeroStyle(row)">
                <small :style="{ opacity: clampPercent((row.config as any).textOpacity, 100) / 100 }">{{ (row.config as any).eyebrow || "慢π活动运营" }}</small>
                <h4 :style="{ opacity: clampPercent((row.config as any).titleOpacity, 100) / 100 }">{{ row.title }}</h4>
                <p :style="{ opacity: clampPercent((row.config as any).subtitleOpacity, 86) / 100 }">{{ row.subtitle }}</p>
                <div v-if="(row.config as any).primaryButtonText" class="preview-hero-button" :style="{ background: rgba('#ffffff', (row.config as any).buttonOpacity, 18) }">{{ (row.config as any).primaryButtonText }}</div>
                <div v-if="(row.config as any).showStats !== false" class="preview-hero-stats">
                  <span :style="{ background: rgba('#ffffff', (row.config as any).statsOpacity, 14) }">9<br />报名中</span>
                  <span :style="{ background: rgba('#ffffff', (row.config as any).statsOpacity, 14) }">10<br />全部活动</span>
                </div>
              </div>
              <div v-else-if="row.type === 'quick_nav'" class="preview-grid">
                <span v-for="item in ((row.config as any).items || []).slice(0, 4)" :key="item.label">{{ item.label }}</span>
              </div>
              <div v-else-if="row.type === 'image_banner'" class="preview-banner">
                <img v-if="(row.config as any).imageUrl" :src="(row.config as any).imageUrl" />
                <span v-else>图片 Banner</span>
              </div>
              <div v-else-if="row.type === 'bottom_nav'" class="preview-bottom-nav" :style="{ '--preview-nav-count': previewNavCount(row) }">
                <span v-for="item in enabledNavItems(row)" :key="item.label">
                  <b>{{ item.icon || item.label?.slice(0, 1) }}</b>{{ item.label }}
                </span>
              </div>
              <div v-else-if="row.type === 'my_page'" class="preview-my" :style="{ background: String((row.layout as any).heroBackgroundColor || '#111827'), color: String((row.layout as any).heroTextColor || '#ffffff') }">
                <strong>{{ (row.config as any).greeting || row.title || "我的活动" }}</strong>
                <span v-for="item in ((row.config as any).tools || []).slice(0, 4)" :key="item.label">{{ item.label }}</span>
              </div>
              <div v-else-if="row.type === 'inner_pages'" class="preview-inner-pages">
                <strong>{{ row.title || "内页布局" }}</strong>
                <span v-for="item in ((row.config as any).pages || []).slice(0, 4)" :key="item.key">{{ item.title }}</span>
              </div>
              <div v-else class="preview-section" :style="previewSectionStyle(row)">
                <strong>{{ row.title || typeLabel(row.type) }}</strong>
                <span>{{ typeLabel(row.type) }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <aside class="builder-inspector">
        <div v-if="!editorOpen" class="inspector-empty">
          <h3>模块配置</h3>
          <p>点击左侧模块行，或直接点击手机预览中的模块，在这里编辑内容、样式、跳转和数据源。</p>
          <el-button type="primary" plain @click="runHealthCheck">先做生效检测</el-button>
        </div>
        <template v-else>
          <div class="inspector-head">
            <div>
              <strong>{{ editingId ? "编辑模块" : "新增模块" }}</strong>
              <span>{{ form.title || typeLabel(form.type) }}</span>
            </div>
            <el-tag v-if="hasEditorUnsavedChanges" type="warning" effect="plain">未保存</el-tag>
          </div>
          <el-tabs v-model="editorTab" stretch>
            <el-tab-pane label="内容" name="content">
              <el-form label-position="top" class="inspector-form">
                <div class="form-grid">
                  <el-form-item label="模块类型">
                    <el-select v-model="form.type" @change="onTypeChange">
                      <el-option v-for="item in moduleTypes" :key="item.type" :label="item.label" :value="item.type" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="是否显示">
                    <el-switch v-model="form.enabled" />
                  </el-form-item>
                </div>
                <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
                <el-form-item label="副标题"><el-input v-model="form.subtitle" /></el-form-item>

                <template v-if="form.type === 'hero'">
                  <el-divider>主视觉</el-divider>
                  <el-form-item label="角标"><el-input v-model="form.config.eyebrow" @input="syncJsonText" /></el-form-item>
                  <el-form-item label="按钮文案"><el-input v-model="form.config.primaryButtonText" @input="syncJsonText" /></el-form-item>
                </template>

                <template v-if="form.type === 'quick_nav'">
                  <el-divider>快捷入口</el-divider>
                  <div class="compact-editor">
                    <div v-for="(item, index) in (form.config.items || [])" :key="index" class="compact-row">
                      <el-input :model-value="item.label" placeholder="名称" @input="(value: string) => updateQuickLabel(index, value)" />
                      <el-button @click="openArrayLinkPicker('items', index, 'link', `${item.label || '入口'}跳转`)">{{ linkDisplayName(item.link) }}</el-button>
                      <el-color-picker :model-value="item.color" @change="(value: string | null) => updateQuickColor(index, value)" />
                      <el-button type="danger" :icon="Delete" @click="removeQuickItem(index)" />
                    </div>
                    <el-button :icon="Plus" @click="addQuickItem">新增入口</el-button>
                  </div>
                </template>

                <template v-if="form.type === 'image_banner'">
                  <el-divider>图片广告</el-divider>
                  <el-form-item label="图片">
                    <div class="upload-line">
                      <el-input v-model="form.config.imageUrl" @input="syncJsonText" />
                      <el-upload :show-file-list="false" :before-upload="uploadBannerImage">
                        <el-button :icon="Upload">上传</el-button>
                      </el-upload>
                    </div>
                  </el-form-item>
                  <el-form-item label="展示比例">
                    <el-select v-model="form.config.ratio" @change="syncJsonText">
                      <el-option label="横幅 3:1" value="3:1" />
                      <el-option label="宽屏 16:9" value="16:9" />
                      <el-option label="方图 1:1" value="1:1" />
                      <el-option label="海报 4:5" value="4:5" />
                    </el-select>
                  </el-form-item>
                </template>

                <template v-if="form.type === 'rich_text'">
                  <el-divider>富文本</el-divider>
                  <el-form-item label="内容"><el-input v-model="form.config.content" type="textarea" :rows="5" @input="syncJsonText" /></el-form-item>
                  <el-form-item label="图片">
                    <div class="upload-line">
                      <el-input v-model="form.config.imageUrl" @input="syncJsonText" />
                      <el-upload :show-file-list="false" :before-upload="uploadRichTextImage">
                        <el-button :icon="Upload">上传</el-button>
                      </el-upload>
                    </div>
                  </el-form-item>
                </template>

                <template v-if="form.type === 'bottom_nav'">
                  <el-divider>底部导航</el-divider>
                  <el-alert class="editor-tip" type="info" show-icon :closable="false" title="底部导航最多 5 项。H5 保存后刷新生效，小程序需要重新构建并上传最新版。" />
                  <div class="compact-editor">
                    <div v-for="(item, index) in (form.config.items || [])" :key="index" class="compact-row nav-compact-row">
                      <el-input :model-value="item.label" placeholder="名称" @input="(value: string) => updateConfigArrayItem('items', index, 'label', value)" />
                      <el-input :model-value="item.icon" placeholder="图标" @input="(value: string) => updateConfigArrayItem('items', index, 'icon', value)" />
                      <el-button @click="openArrayLinkPicker('items', index, 'link', `${item.label || '菜单'}跳转`)">{{ linkDisplayName(item.link) }}</el-button>
                      <el-switch :model-value="item.enabled !== false" @change="(value: string | number | boolean) => updateConfigArrayItemBoolean('items', index, 'enabled', Boolean(value))" />
                      <el-button type="danger" :icon="Delete" @click="removeConfigArrayItem('items', index)" />
                    </div>
                    <el-button :icon="Plus" :disabled="Array.isArray(form.config.items) && form.config.items.length >= 5" @click="addNavItem">新增菜单</el-button>
                  </div>
                </template>

                <template v-if="form.type === 'my_page'">
                  <el-divider>我的页入口</el-divider>
                  <el-form-item label="头部标题"><el-input v-model="form.config.greeting" @input="syncJsonText" /></el-form-item>
                  <div class="compact-editor">
                    <div v-for="(item, index) in (form.config.tools || [])" :key="index" class="compact-row">
                      <el-input :model-value="item.label" placeholder="名称" @input="(value: string) => updateConfigArrayItem('tools', index, 'label', value)" />
                      <el-button @click="openArrayLinkPicker('tools', index, 'link', `${item.label || '入口'}跳转`)">{{ linkDisplayName(item.link) }}</el-button>
                      <el-color-picker :model-value="item.color" @change="(value: string | null) => updateConfigArrayItem('tools', index, 'color', String(value || '#0f766e'))" />
                      <el-button type="danger" :icon="Delete" @click="removeConfigArrayItem('tools', index)" />
                    </div>
                    <el-button :icon="Plus" @click="addMyTool">新增我的页入口</el-button>
                  </div>
                </template>

                <template v-if="form.type === 'inner_pages'">
                  <el-divider>内页配置</el-divider>
                  <div class="compact-editor">
                    <div v-for="(item, index) in (form.config.pages || [])" :key="index" class="inner-page-row compact-inner-row">
                      <el-input :model-value="item.key" placeholder="页面 key" @input="(value: string) => updateInnerPage(index, 'key', value)" />
                      <el-input :model-value="item.title" placeholder="标题" @input="(value: string) => updateInnerPage(index, 'title', value)" />
                      <el-checkbox :model-value="item.showBottomNav !== false" @change="(value: string | number | boolean) => updateInnerPage(index, 'showBottomNav', Boolean(value))">底栏</el-checkbox>
                      <el-button type="danger" :icon="Delete" @click="removeConfigArrayItem('pages', index)" />
                    </div>
                    <el-button :icon="Plus" @click="addInnerPage">新增内页配置</el-button>
                  </div>
                </template>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="样式" name="style">
              <el-form label-position="top" class="inspector-form">
                <el-form-item label="视觉预设">
                  <div class="visual-preset-list">
                    <el-button v-for="preset in visualPresets" :key="preset.key" @click="applyVisualPreset(preset.key)">{{ preset.label }}</el-button>
                  </div>
                </el-form-item>
                <template v-if="form.type === 'hero'">
                  <el-form-item label="背景色"><el-color-picker v-model="form.config.backgroundColor" @change="syncJsonText" /></el-form-item>
                  <el-form-item label="背景图">
                    <div class="upload-line">
                      <el-input v-model="form.config.backgroundImage" @input="syncJsonText" />
                      <el-upload :show-file-list="false" :before-upload="uploadHeroBackground">
                        <el-button :icon="Upload">上传</el-button>
                      </el-upload>
                    </div>
                  </el-form-item>
                  <el-form-item label="遮罩透明度"><el-slider v-model="form.config.overlayOpacity" :min="0" :max="95" show-input @change="syncJsonText" /></el-form-item>
                </template>
                <div class="form-grid">
                  <el-form-item label="主题色"><el-color-picker v-model="form.layout.primaryColor" @change="syncJsonText" /></el-form-item>
                  <el-form-item label="强调色"><el-color-picker v-model="form.layout.accentColor" @change="syncJsonText" /></el-form-item>
                  <el-form-item label="文字色"><el-color-picker v-model="form.layout.textColor" @change="syncJsonText" /></el-form-item>
                  <el-form-item label="背景色"><el-color-picker v-model="form.layout.backgroundColor" show-alpha @change="syncJsonText" /></el-form-item>
                  <el-form-item label="下方间距"><el-input-number v-model="form.layout.spacingBottom" :min="0" :max="80" @change="syncJsonText" /></el-form-item>
                  <el-form-item label="圆角"><el-input-number v-model="form.layout.borderRadius" :min="0" :max="24" @change="syncJsonText" /></el-form-item>
                </div>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="跳转" name="link">
              <div class="link-list">
                <div v-if="form.config.primaryButtonLink !== undefined" class="link-row">
                  <span>主按钮</span>
                  <el-button @click="openConfigLinkPicker('primaryButtonLink', '主按钮跳转')">{{ linkDisplayName(form.config.primaryButtonLink) }}</el-button>
                </div>
                <div v-if="form.config.link !== undefined" class="link-row">
                  <span>模块链接</span>
                  <el-button @click="openConfigLinkPicker('link', '模块链接')">{{ linkDisplayName(form.config.link) }}</el-button>
                </div>
                <div v-for="(item, index) in (form.config.items || [])" :key="`items-${index}`" class="link-row">
                  <span>{{ item.label || `入口 ${index + 1}` }}</span>
                  <el-button @click="openArrayLinkPicker('items', index, 'link', `${item.label || '入口'}跳转`)">{{ linkDisplayName(item.link) }}</el-button>
                </div>
                <div v-for="(item, index) in (form.config.tools || [])" :key="`tools-${index}`" class="link-row">
                  <span>{{ item.label || `工具 ${index + 1}` }}</span>
                  <el-button @click="openArrayLinkPicker('tools', index, 'link', `${item.label || '工具'}跳转`)">{{ linkDisplayName(item.link) }}</el-button>
                </div>
                <el-empty v-if="form.config.primaryButtonLink === undefined && form.config.link === undefined && !(form.config.items || []).length && !(form.config.tools || []).length" description="这个模块没有可配置跳转" />
              </div>
            </el-tab-pane>

            <el-tab-pane label="数据源" name="data">
              <el-form label-position="top" class="inspector-form">
                <template v-if="['featured_activities', 'activity_feed', 'testimonial_feed', 'featured_testimonials', 'activity_testimonials'].includes(form.type)">
                  <el-form-item label="数据来源">
                    <el-select v-model="form.config.source" clearable @change="syncJsonText">
                      <el-option label="精选/推荐" value="featured" />
                      <el-option label="最新" value="latest" />
                      <el-option label="参与者内容" value="participant" />
                      <el-option label="按活动" value="activity" />
                    </el-select>
                  </el-form-item>
                </template>
                <el-form-item v-if="form.config.limit !== undefined" label="展示数量">
                  <el-input-number v-model="form.config.limit" :min="1" :max="30" @change="syncJsonText" />
                </el-form-item>
                <el-form-item v-if="form.config.pageSize !== undefined" label="每页数量">
                  <el-input-number v-model="form.config.pageSize" :min="1" :max="12" @change="syncJsonText" />
                </el-form-item>
                <el-alert type="info" show-icon :closable="false" title="数据源配置只决定模块如何取内容；活动、课程、商品本身仍在对应业务模块维护。" />
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="兼容性" name="compat">
              <div class="compat-panel">
                <el-alert type="warning" show-icon :closable="false" title="H5 保存后刷新可见；小程序需要重新构建并上传最新版，外部 H5 链接需要配置业务域名。" />
                <el-button type="warning" plain @click="runHealthCheck">运行整页生效检测</el-button>
                <el-divider>高级 JSON</el-divider>
                <el-form label-position="top">
                  <el-form-item label="config 高级配置"><el-input v-model="configText" type="textarea" :rows="7" /></el-form-item>
                  <el-form-item label="layout 布局配置"><el-input v-model="layoutText" type="textarea" :rows="7" /></el-form-item>
                </el-form>
              </div>
            </el-tab-pane>
          </el-tabs>
          <div class="inspector-actions">
            <el-button @click="closeDrawer()">取消</el-button>
            <el-button :icon="View" @click="openCurrentPreview">打开已保存H5</el-button>
            <el-button type="primary" :loading="saving" @click="submit">保存模块</el-button>
          </div>
        </template>
      </aside>
    </div>

    <el-drawer v-model="drawer" title="编辑首页模块" size="560px" :before-close="closeDrawer">
      <div class="drawer-save-bar">
        <div>
          <strong>{{ editingId ? "保存当前模块" : "保存新模块" }}</strong>
          <span>{{ form.title || typeLabel(form.type) }}</span>
        </div>
        <el-tag v-if="hasUnsavedChanges" type="warning" effect="plain">未保存修改</el-tag>
        <div class="drawer-save-actions">
          <el-button @click="closeDrawer()">取消</el-button>
          <el-button :icon="View" @click="openCurrentPreview">打开已保存H5</el-button>
          <el-button type="primary" :loading="saving" @click="submit">保存模块</el-button>
        </div>
      </div>
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="模块类型">
            <el-select v-model="form.type" @change="onTypeChange">
              <el-option v-for="item in moduleTypes" :key="item.type" :label="item.label" :value="item.type" />
            </el-select>
          </el-form-item>
          <el-form-item label="是否显示">
            <el-switch v-model="form.enabled" />
          </el-form-item>
          <el-form-item label="标题">
            <el-input v-model="form.title" />
          </el-form-item>
          <el-form-item label="副标题">
            <el-input v-model="form.subtitle" />
          </el-form-item>
        </div>

        <template v-if="form.type === 'hero'">
          <el-form-item label="角标"><el-input v-model="form.config.eyebrow" @input="syncJsonText" /></el-form-item>
          <el-form-item label="按钮文案"><el-input v-model="form.config.primaryButtonText" @input="syncJsonText" /></el-form-item>
          <el-form-item label="按钮跳转"><el-input v-model="form.config.primaryButtonLink" @input="syncJsonText" /></el-form-item>
          <el-form-item label="背景色"><el-color-picker v-model="form.config.backgroundColor" @change="syncJsonText" /></el-form-item>
          <el-form-item label="背景图">
            <div class="upload-line">
              <el-input v-model="form.config.backgroundImage" @input="syncJsonText" />
              <el-upload :show-file-list="false" :before-upload="uploadHeroBackground">
                <el-button :icon="Upload">上传</el-button>
              </el-upload>
            </div>
          </el-form-item>
          <el-form-item label="背景适配">
            <el-radio-group v-model="form.config.backgroundFit" @change="syncJsonText">
              <el-radio-button value="cover">裁切铺满</el-radio-button>
              <el-radio-button value="contain">完整显示</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="遮罩颜色"><el-color-picker v-model="form.config.overlayColor" @change="syncJsonText" /></el-form-item>
          <el-form-item label="遮罩透明度"><el-slider v-model="form.config.overlayOpacity" :min="0" :max="95" show-input @change="syncJsonText" /></el-form-item>
          <el-form-item label="角标透明度"><el-slider v-model="form.config.textOpacity" :min="20" :max="100" show-input @change="syncJsonText" /></el-form-item>
          <el-form-item label="标题透明度"><el-slider v-model="form.config.titleOpacity" :min="20" :max="100" show-input @change="syncJsonText" /></el-form-item>
          <el-form-item label="副标题透明度"><el-slider v-model="form.config.subtitleOpacity" :min="20" :max="100" show-input @change="syncJsonText" /></el-form-item>
          <el-form-item label="按钮透明度"><el-slider v-model="form.config.buttonOpacity" :min="0" :max="80" show-input @change="syncJsonText" /></el-form-item>
          <el-form-item label="统计卡透明度"><el-slider v-model="form.config.statsOpacity" :min="0" :max="80" show-input @change="syncJsonText" /></el-form-item>
        </template>

        <template v-if="form.type === 'quick_nav'">
          <div class="quick-editor">
            <div v-for="(item, index) in (form.config.items || [])" :key="index" class="quick-row">
              <el-input :model-value="item.label" placeholder="名称" @input="(value: string) => updateQuickLabel(index, value)" />
              <el-input :model-value="item.link" placeholder="跳转路径" @input="(value: string) => updateQuickLink(index, value)" />
              <el-color-picker :model-value="item.color" @change="(value: string | null) => updateQuickColor(index, value)" />
              <el-button type="danger" :icon="Delete" @click="removeQuickItem(index)" />
            </div>
            <el-button :icon="Plus" @click="addQuickItem">新增入口</el-button>
          </div>
        </template>

        <template v-if="['featured_activities', 'activity_feed'].includes(form.type)">
          <el-form-item label="数据来源">
            <el-select v-model="form.config.source" @change="syncJsonText">
              <el-option label="精选活动" value="featured" />
              <el-option label="最新活动" value="latest" />
            </el-select>
          </el-form-item>
          <el-form-item label="展示数量"><el-input-number v-model="form.config.limit" :min="1" :max="30" @change="syncJsonText" /></el-form-item>
          <template v-if="form.type === 'activity_feed'">
            <el-form-item label="每页数量"><el-input-number v-model="form.config.pageSize" :min="1" :max="12" @change="syncJsonText" /></el-form-item>
            <el-form-item label="分页样式">
              <el-radio-group v-model="form.config.pagination" @change="syncJsonText">
                <el-radio-button value="pager">上一页 / 下一页</el-radio-button>
                <el-radio-button value="load_more">加载更多</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </template>
        </template>

        <template v-if="['category_grid', 'announcement_bar', 'activity_tabs'].includes(form.type)">
          <el-form-item label="展示数量"><el-input-number v-model="form.config.limit" :min="1" :max="30" @change="syncJsonText" /></el-form-item>
        </template>

        <template v-if="form.type === 'image_banner'">
          <el-form-item label="图片">
            <div class="upload-line">
              <el-input v-model="form.config.imageUrl" @input="syncJsonText" />
              <el-upload :show-file-list="false" :before-upload="uploadBannerImage">
                <el-button :icon="Upload">上传</el-button>
              </el-upload>
            </div>
          </el-form-item>
          <el-form-item label="链接"><el-input v-model="form.config.link" @input="syncJsonText" /></el-form-item>
          <el-form-item label="展示比例">
            <el-select v-model="form.config.ratio" @change="syncJsonText">
              <el-option label="横幅 3:1" value="3:1" />
              <el-option label="宽屏 16:9" value="16:9" />
              <el-option label="方图 1:1" value="1:1" />
              <el-option label="海报 4:5" value="4:5" />
            </el-select>
          </el-form-item>
          <el-form-item label="图片适配">
            <el-radio-group v-model="form.config.fit" @change="syncJsonText">
              <el-radio-button value="cover">裁切铺满</el-radio-button>
              <el-radio-button value="contain">完整显示</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </template>

        <template v-if="form.type === 'rich_text'">
          <el-form-item label="内容"><el-input v-model="form.config.content" type="textarea" :rows="5" @input="syncJsonText" /></el-form-item>
          <el-form-item label="图片">
            <div class="upload-line">
              <el-input v-model="form.config.imageUrl" @input="syncJsonText" />
              <el-upload :show-file-list="false" :before-upload="uploadRichTextImage">
                <el-button :icon="Upload">上传</el-button>
              </el-upload>
            </div>
          </el-form-item>
        </template>

        <template v-if="form.type === 'bottom_nav'">
          <el-alert
            class="editor-tip"
            type="info"
            show-icon
            :closable="false"
            title="这里控制前台页面底部固定导航，也就是手机底部的“慢π / 课程 / 共修 / 活动 / 我的”。保存后 H5 刷新生效，小程序需要重新上传审核。"
          />
          <div class="quick-editor">
            <div v-for="(item, index) in (form.config.items || [])" :key="index" class="quick-row nav-row">
              <el-input :model-value="item.label" placeholder="菜单名称" @input="(value: string) => updateConfigArrayItem('items', index, 'label', value)" />
              <el-input :model-value="item.icon" placeholder="图标字" @input="(value: string) => updateConfigArrayItem('items', index, 'icon', value)" />
              <el-input :model-value="item.activeIcon" placeholder="选中图标字" @input="(value: string) => updateConfigArrayItem('items', index, 'activeIcon', value)" />
              <el-input :model-value="item.link" placeholder="跳转路径" @input="(value: string) => updateConfigArrayItem('items', index, 'link', value)" />
              <el-input :model-value="item.action" placeholder="action，如 mainPage" @input="(value: string) => updateConfigArrayItem('items', index, 'action', value)" />
              <div class="upload-line">
                <el-input :model-value="item.iconUrl" placeholder="图标图片" @input="(value: string) => updateConfigArrayItem('items', index, 'iconUrl', value)" />
                <el-upload :show-file-list="false" :before-upload="(file: File) => uploadConfigArrayItemImage(file, 'items', index, 'iconUrl')">
                  <el-button :icon="Upload">上传</el-button>
                </el-upload>
              </div>
              <el-color-picker :model-value="item.color" @change="(value: string | null) => updateConfigArrayItem('items', index, 'color', String(value || '#0f766e'))" />
              <el-switch :model-value="item.enabled !== false" @change="(value: string | number | boolean) => updateConfigArrayItemBoolean('items', index, 'enabled', Boolean(value))" />
              <el-button type="danger" :icon="Delete" @click="removeConfigArrayItem('items', index)" />
            </div>
            <el-button :icon="Plus" :disabled="Array.isArray(form.config.items) && form.config.items.length >= 5" @click="addNavItem">新增菜单</el-button>
          </div>
          <el-divider>底部导航外观</el-divider>
          <div class="form-grid">
            <el-form-item label="背景色"><el-color-picker v-model="form.layout.backgroundColor" show-alpha @change="syncJsonText" /></el-form-item>
            <el-form-item label="选中色"><el-color-picker v-model="form.layout.activeColor" @change="syncJsonText" /></el-form-item>
            <el-form-item label="未选中色"><el-color-picker v-model="form.layout.textColor" @change="syncJsonText" /></el-form-item>
          </div>
        </template>

        <template v-if="form.type === 'my_page'">
          <el-form-item label="头部标题"><el-input v-model="form.config.greeting" @input="syncJsonText" /></el-form-item>
          <div class="quick-editor">
            <div v-for="(item, index) in (form.config.tools || [])" :key="index" class="quick-row my-tool-row">
              <el-input :model-value="item.icon" placeholder="图标字" @input="(value: string) => updateConfigArrayItem('tools', index, 'icon', value)" />
              <el-input :model-value="item.label" placeholder="入口名称" @input="(value: string) => updateConfigArrayItem('tools', index, 'label', value)" />
              <el-input :model-value="item.link" placeholder="跳转路径" @input="(value: string) => updateConfigArrayItem('tools', index, 'link', value)" />
              <el-input :model-value="item.action" placeholder="action，如 refresh/mainPage" @input="(value: string) => updateConfigArrayItem('tools', index, 'action', value)" />
              <el-color-picker :model-value="item.color" @change="(value: string | null) => updateConfigArrayItem('tools', index, 'color', String(value || '#0f766e'))" />
              <el-button type="danger" :icon="Delete" @click="removeConfigArrayItem('tools', index)" />
            </div>
            <el-button :icon="Plus" @click="addMyTool">新增我的页入口</el-button>
          </div>
        </template>

        <template v-if="form.type === 'inner_pages'">
          <div class="quick-editor">
            <div v-for="(item, index) in (form.config.pages || [])" :key="index" class="inner-page-row">
              <el-input :model-value="item.key" placeholder="页面 key" @input="(value: string) => updateInnerPage(index, 'key', value)" />
              <el-input :model-value="item.title" placeholder="标题" @input="(value: string) => updateInnerPage(index, 'title', value)" />
              <el-input :model-value="item.subtitle" placeholder="副标题" @input="(value: string) => updateInnerPage(index, 'subtitle', value)" />
              <el-checkbox :model-value="item.showBottomNav !== false" @change="(value: string | number | boolean) => updateInnerPage(index, 'showBottomNav', Boolean(value))">显示底部菜单</el-checkbox>
              <el-button type="danger" :icon="Delete" @click="removeConfigArrayItem('pages', index)" />
            </div>
            <el-button :icon="Plus" @click="addInnerPage">新增内页配置</el-button>
          </div>
          <el-divider>内页外观</el-divider>
          <div class="form-grid">
            <el-form-item label="头部背景色"><el-color-picker v-model="form.layout.headerBackgroundColor" show-alpha @change="syncJsonText" /></el-form-item>
            <el-form-item label="头部标题色"><el-color-picker v-model="form.layout.headerTextColor" @change="syncJsonText" /></el-form-item>
            <el-form-item label="头部副标题色"><el-color-picker v-model="form.layout.headerSubtitleColor" @change="syncJsonText" /></el-form-item>
            <el-form-item label="筛选栏背景"><el-color-picker v-model="form.layout.stickyFilterBackground" show-alpha @change="syncJsonText" /></el-form-item>
            <el-form-item label="底部操作栏背景"><el-color-picker v-model="form.layout.actionBarBackgroundColor" show-alpha @change="syncJsonText" /></el-form-item>
          </div>
        </template>

        <el-divider>通用外观</el-divider>
        <el-form-item label="视觉预设">
          <div class="visual-preset-list">
            <el-button v-for="preset in visualPresets" :key="preset.key" @click="applyVisualPreset(preset.key)">
              {{ preset.label }}
            </el-button>
          </div>
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="主题色">
            <el-color-picker v-model="form.layout.primaryColor" @change="syncJsonText" />
          </el-form-item>
          <el-form-item label="强调色">
            <el-color-picker v-model="form.layout.accentColor" @change="syncJsonText" />
          </el-form-item>
          <el-form-item label="文字色">
            <el-color-picker v-model="form.layout.textColor" @change="syncJsonText" />
          </el-form-item>
          <el-form-item label="辅助文字色">
            <el-color-picker v-model="form.layout.mutedColor" @change="syncJsonText" />
          </el-form-item>
          <el-form-item label="字体风格">
            <el-select v-model="form.layout.fontStyle" placeholder="默认" clearable @change="syncJsonText">
              <el-option label="系统无衬线" value="system" />
              <el-option label="雅致楷体" value="kaiti" />
              <el-option label="典雅衬线" value="serif" />
            </el-select>
          </el-form-item>
          <el-form-item label="模块密度">
            <el-select v-model="form.layout.density" placeholder="默认" clearable @change="syncJsonText">
              <el-option label="紧凑" value="compact" />
              <el-option label="舒适" value="comfortable" />
              <el-option label="宽松" value="spacious" />
            </el-select>
          </el-form-item>
          <el-form-item label="按钮样式">
            <el-select v-model="form.layout.buttonStyle" placeholder="默认" clearable @change="syncJsonText">
              <el-option label="胶囊" value="pill" />
              <el-option label="圆角" value="rounded" />
              <el-option label="方角" value="square" />
            </el-select>
          </el-form-item>
          <el-form-item label="卡片样式">
            <el-select v-model="form.layout.cardStyle" placeholder="默认" clearable @change="syncJsonText">
              <el-option label="柔和阴影" value="soft" />
              <el-option label="描边" value="outlined" />
              <el-option label="浮起" value="elevated" />
              <el-option label="扁平" value="flat" />
            </el-select>
          </el-form-item>
          <el-form-item label="分割样式">
            <el-select v-model="form.layout.dividerStyle" placeholder="默认" clearable @change="syncJsonText">
              <el-option label="无" value="none" />
              <el-option label="细线" value="line" />
              <el-option label="柔和底色" value="soft" />
            </el-select>
          </el-form-item>
          <el-form-item label="下方间距">
            <el-input-number v-model="form.layout.spacingBottom" :min="0" :max="80" @change="syncJsonText" />
          </el-form-item>
          <el-form-item label="圆角">
            <el-input-number v-model="form.layout.borderRadius" :min="0" :max="24" @change="syncJsonText" />
          </el-form-item>
          <el-form-item label="背景色">
            <el-color-picker v-model="form.layout.backgroundColor" show-alpha @change="syncJsonText" />
          </el-form-item>
          <el-form-item label="背景图">
            <div class="upload-line">
              <el-input v-model="form.layout.backgroundImage" @input="syncJsonText" />
              <el-upload :show-file-list="false" :before-upload="uploadLayoutImage">
                <el-button :icon="Upload">上传</el-button>
              </el-upload>
            </div>
          </el-form-item>
        </div>

        <el-form-item label="config 高级配置">
          <el-input v-model="configText" type="textarea" :rows="8" spellcheck="false" />
        </el-form-item>
        <el-form-item label="layout 布局配置">
          <el-input v-model="layoutText" type="textarea" :rows="5" spellcheck="false" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDrawer()">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存模块</el-button>
      </template>
    </el-drawer>

    <div v-if="drawer" class="drawer-live-preview">
      <div class="drawer-live-preview-head">
        <strong>当前模块实时预览</strong>
        <span>保存后才会同步到前台 H5</span>
      </div>
      <div v-if="!drawerPreviewRow" class="drawer-preview-invalid">JSON 格式有误，修正 config / layout 后会恢复预览。</div>
      <div v-else class="drawer-preview-canvas">
        <div v-for="row in previewRows" :key="row.id" class="preview-row-shell" :class="{ focused: isFocusedPreviewRow(row), fallback: hasDefaultPreviewFallback }">
          <div v-if="row.type === 'search_bar'" class="preview-search">
            <span>{{ (row.config as any).cityLabel || "本地" }}</span>
            <b>{{ (row.config as any).placeholder || "搜索活动" }}</b>
          </div>
          <div v-else-if="row.type === 'hero'" class="preview-hero" :style="previewHeroStyle(row)">
            <small :style="{ opacity: clampPercent((row.config as any).textOpacity, 100) / 100 }">{{ (row.config as any).eyebrow || "慢π活动运营" }}</small>
            <h4 :style="{ opacity: clampPercent((row.config as any).titleOpacity, 100) / 100 }">{{ row.title }}</h4>
            <p :style="{ opacity: clampPercent((row.config as any).subtitleOpacity, 86) / 100 }">{{ row.subtitle }}</p>
            <div v-if="(row.config as any).primaryButtonText" class="preview-hero-button" :style="{ background: rgba('#ffffff', (row.config as any).buttonOpacity, 18) }">{{ (row.config as any).primaryButtonText }}</div>
            <div v-if="(row.config as any).showStats !== false" class="preview-hero-stats">
              <span :style="{ background: rgba('#ffffff', (row.config as any).statsOpacity, 14) }">9<br />报名中</span>
              <span :style="{ background: rgba('#ffffff', (row.config as any).statsOpacity, 14) }">10<br />全部活动</span>
            </div>
          </div>
          <div v-else-if="row.type === 'quick_nav'" class="preview-grid">
            <span v-for="item in ((row.config as any).items || []).slice(0, 4)" :key="item.label">{{ item.label }}</span>
          </div>
          <div v-else-if="row.type === 'image_banner'" class="preview-banner">
            <img v-if="(row.config as any).imageUrl" :src="(row.config as any).imageUrl" />
            <span v-else>图片 Banner</span>
          </div>
          <div v-else-if="row.type === 'bottom_nav'" class="preview-bottom-nav drawer-bottom-nav" :style="{ '--preview-nav-count': previewNavCount(row) }">
            <span v-for="item in enabledNavItems(row)" :key="item.label">
              <b>{{ item.icon || item.label?.slice(0, 1) }}</b>{{ item.label }}
            </span>
          </div>
          <div v-else-if="row.type === 'my_page'" class="preview-my" :style="{ background: String((row.layout as any).heroBackgroundColor || '#111827'), color: String((row.layout as any).heroTextColor || '#ffffff') }">
            <strong>{{ (row.config as any).greeting || row.title || "我的活动" }}</strong>
            <span v-for="item in ((row.config as any).tools || []).slice(0, 4)" :key="item.label">{{ item.label }}</span>
          </div>
          <div v-else-if="row.type === 'inner_pages'" class="preview-inner-pages">
            <strong>{{ row.title || "内页布局" }}</strong>
            <span v-for="item in ((row.config as any).pages || []).slice(0, 4)" :key="item.key">{{ item.title }}</span>
          </div>
          <div v-else class="preview-section" :style="previewSectionStyle(row)">
            <strong>{{ row.title || typeLabel(row.type) }}</strong>
            <span>{{ typeLabel(row.type) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.builder-page { padding: 20px; }
.builder-toolbar { position: sticky; top: 0; z-index: 30; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin: 0 -20px 16px; padding: 16px 20px 14px; border-bottom: 1px solid #e5e7eb; background: rgba(245, 247, 251, 0.96); backdrop-filter: blur(10px); }
.builder-toolbar h2 { margin: 0; font-size: 22px; }
.builder-toolbar p { margin: 6px 0 0; color: #667085; }
.toolbar-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.preview-link { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; margin: 0 0 12px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #475467; }
.preview-link strong { color: #111827; white-space: nowrap; }
.preview-link span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview-link small { flex-basis: 100%; color: #667085; font-weight: 700; }
.scope-tip { margin: 0 0 16px; padding: 12px 14px; border: 1px solid #b7e4d7; border-radius: 8px; background: #ecfdf5; color: #047857; font-weight: 700; }
.scope-tip.muted { border-color: #e5e7eb; background: #f8fafc; color: #667085; }
.builder-help { display: grid; gap: 18px; color: #334155; line-height: 1.72; }
.builder-help h3 { margin: 0 0 8px; color: #0f172a; font-size: 16px; }
.builder-help p { margin: 0; }
.builder-help ol { margin: 0; padding-left: 20px; }
.builder-help-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.builder-help-grid article { display: grid; gap: 5px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f8fafc; }
.builder-help-grid strong { color: #0f766e; }
.builder-help-grid span { color: #475569; font-size: 13px; }
.builder-help-warning { padding: 12px; border: 1px solid #fed7aa; border-radius: 8px; background: #fff7ed; color: #9a3412; }
.ui-kit-dialog-body { display: grid; grid-template-columns: minmax(0, 1.05fr) 360px; gap: 16px; align-items: start; }
.ui-kit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; max-height: min(68vh, 760px); overflow: auto; padding-right: 4px; }
.ui-kit-card { overflow: hidden; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
.ui-kit-card.featured { border-color: #f1c76a; box-shadow: 0 14px 34px rgba(154, 106, 36, 0.12); }
.ui-kit-card.active { border-color: #0f766e; box-shadow: 0 16px 38px rgba(15, 118, 110, 0.15); transform: translateY(-1px); }
.ui-kit-preview { height: 150px; display: grid; place-items: center; padding: 16px; }
.ui-kit-phone-card { width: 78%; min-height: 92px; display: grid; align-content: center; gap: 8px; padding: 14px; border-radius: 16px; box-shadow: 0 16px 36px rgba(15, 23, 42, 0.16); }
.ui-kit-phone-card strong { font-size: 16px; }
.ui-kit-phone-card span { color: inherit; opacity: 0.72; font-size: 12px; line-height: 1.4; }
.ui-kit-mini-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.ui-kit-mini-grid i { height: 18px; border-radius: 999px; border: 1px solid rgba(15, 23, 42, 0.08); }
.ui-kit-body { padding: 12px; display: grid; gap: 10px; }
.ui-kit-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ui-kit-title-row strong { color: #111827; }
.ui-kit-body p { min-height: 42px; margin: 0; color: #475467; font-size: 13px; line-height: 1.6; }
.ui-kit-palette { display: flex; gap: 6px; flex-wrap: wrap; }
.ui-kit-palette span { width: 22px; height: 22px; border-radius: 999px; border: 1px solid rgba(15, 23, 42, 0.1); }
.ui-kit-meta { color: #667085; font-size: 12px; }
.ui-kit-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.ui-kit-live-preview { position: sticky; top: 0; display: grid; gap: 12px; align-self: start; }
.ui-kit-live-preview-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.ui-kit-live-preview-head strong { display: block; color: #7c2d12; font-size: 14px; }
.ui-kit-live-preview-head span { display: block; margin-top: 4px; color: #9a3412; font-size: 12px; line-height: 1.5; }
.ui-kit-phone-frame { width: 100%; }
.ui-kit-phone-frame .phone-status { border-radius: 20px 20px 0 0; }
.ui-kit-phone-frame .preview-scroll { height: clamp(420px, calc(68vh - 92px), 560px); overflow-y: auto; scrollbar-width: thin; overscroll-behavior: contain; }
.ui-kit-phone-frame .preview-scroll::-webkit-scrollbar { width: 6px; }
.ui-kit-phone-frame .preview-scroll::-webkit-scrollbar-thumb { border-radius: 999px; background: rgba(100, 116, 139, 0.42); }
.ui-kit-preview-note { margin-top: 8px; color: #9a3412; font-size: 12px; line-height: 1.55; }
.cross-copy-dialog { display: grid; gap: 16px; }
.cross-copy-form { display: grid; gap: 6px; }
.cross-copy-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.cross-copy-plan { display: grid; gap: 6px; padding: 12px; border: 1px solid #bfdbfe; border-radius: 8px; background: #eff6ff; color: #1d4ed8; }
.cross-copy-plan strong { color: #1e3a8a; }
.builder-layout { display: grid; grid-template-columns: 220px minmax(360px, 0.9fr) 340px minmax(360px, 0.9fr); gap: 16px; align-items: start; }
.module-palette, .section-list, .phone-preview, .builder-inspector { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
.module-palette h3, .list-head h3 { margin: 0 0 12px; }
.module-option { width: 100%; display: grid; gap: 4px; text-align: left; border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; cursor: pointer; }
.module-option:hover { border-color: #0f766e; background: #f0fdfa; }
.module-option span { font-weight: 800; color: #111827; }
.module-option small { color: #667085; }
.list-head { display: flex; justify-content: space-between; align-items: center; color: #667085; }
.section-row { display: grid; grid-template-columns: 28px 1fr auto; gap: 12px; align-items: center; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: #fff; }
.section-row.disabled { opacity: 0.62; }
.section-row.active { border-color: #f97316; background: #fff7ed; box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12); }
.drag-handle { color: #98a2b3; font-weight: 900; cursor: grab; }
.section-main { cursor: pointer; min-width: 0; }
.section-title { display: flex; align-items: center; gap: 8px; }
.section-main p { margin: 6px 0 0; color: #667085; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-actions { display: flex; gap: 6px; align-items: center; }
.empty { padding: 40px 0; color: #98a2b3; text-align: center; }
.phone-preview, .builder-inspector { position: sticky; top: 112px; }
.phone-preview { display: grid; gap: 12px; max-height: calc(100vh - 128px); overflow: auto; }
.preview-panel-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; padding: 4px 2px 0; }
.preview-panel-head strong { display: block; color: #111827; font-size: 15px; }
.preview-panel-head span { display: block; margin-top: 4px; color: #667085; font-size: 12px; line-height: 1.5; }
.preview-panel-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.phone-frame { width: 292px; height: clamp(500px, calc(100vh - 320px), 620px); margin: 0 auto; border: 10px solid #111827; border-radius: 30px; background: #f4f6f8; overflow: hidden; display: flex; flex-direction: column; }
.phone-status { height: 28px; background: #111827; }
.preview-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 12px; scrollbar-width: thin; overscroll-behavior: contain; }
.preview-scroll::-webkit-scrollbar { width: 6px; }
.preview-scroll::-webkit-scrollbar-thumb { border-radius: 999px; background: rgba(148, 163, 184, 0.55); }
.preview-fallback-tip { margin: 0 0 10px; padding: 8px 10px; border: 1px solid #fed7aa; border-radius: 8px; background: #fff7ed; color: #9a3412; font-size: 12px; font-weight: 800; }
.preview-row-shell { position: relative; border: 2px solid transparent; border-radius: 12px; margin: -2px -2px 8px; padding: 2px; }
.preview-row-shell:not(.fallback) { cursor: pointer; }
.preview-row-shell.focused { border-color: #f97316; background: rgba(249, 115, 22, 0.08); box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12); }
.preview-row-shell.focused::before { content: "正在编辑"; position: absolute; top: -10px; right: 8px; z-index: 2; padding: 2px 7px; border-radius: 999px; background: #f97316; color: #fff; font-size: 10px; font-weight: 900; }
.preview-row-shell.fallback:not(.focused) { opacity: 0.92; }
.preview-search { display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center; margin-bottom: 10px; }
.preview-search span { font-weight: 800; }
.preview-search b { background: #fff; border-radius: 999px; padding: 9px 12px; color: #8a94a6; font-weight: 500; }
.preview-hero { color: #fff; border-radius: 8px; padding: 18px; margin-bottom: 10px; }
.preview-hero h4 { margin: 8px 0; font-size: 20px; line-height: 1.2; }
.preview-hero p { margin: 0; color: rgba(255,255,255,0.82); line-height: 1.45; }
.preview-hero-button { display: inline-flex; margin-top: 12px; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; }
.preview-hero-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 14px; }
.preview-hero-stats span { padding: 8px 4px; border-radius: 8px; text-align: center; font-size: 11px; line-height: 1.35; font-weight: 800; }
.preview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
.preview-grid span { min-height: 58px; display: flex; align-items: center; justify-content: center; text-align: center; border-radius: 8px; background: #fff; font-size: 12px; font-weight: 800; }
.preview-banner { height: 86px; border-radius: 8px; overflow: hidden; background: #e6f2ef; display: flex; align-items: center; justify-content: center; color: #0f766e; font-weight: 800; margin-bottom: 10px; }
.preview-banner img { width: 100%; height: 100%; object-fit: cover; }
.preview-section { display: flex; justify-content: space-between; align-items: center; border-radius: 8px; background: #fff; padding: 14px; margin-bottom: 10px; }
.preview-section strong { color: #111827; }
.preview-section span { color: #667085; font-size: 12px; }
.preview-bottom-nav { position: sticky; bottom: 0; display: grid; grid-template-columns: repeat(var(--preview-nav-count, 5), 1fr); gap: 4px; margin: 10px 0 0; padding: 8px; border-radius: 12px; background: #fff; color: #667085; font-size: 12px; text-align: center; box-shadow: 0 -8px 22px rgba(15, 23, 42, 0.08); }
.preview-bottom-nav span { display: grid; justify-items: center; gap: 3px; min-width: 0; }
.preview-bottom-nav b { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 999px; background: #f2f4f7; color: #c43d3d; font-size: 12px; }
.preview-my { display: grid; gap: 8px; margin-bottom: 10px; padding: 14px; border-radius: 8px; background: #111827; color: #fff; }
.preview-my span { display: inline-flex; margin-right: 6px; padding: 5px 8px; border-radius: 999px; background: rgba(255,255,255,0.14); font-size: 12px; }
.preview-inner-pages { display: grid; gap: 8px; margin-bottom: 10px; padding: 14px; border-radius: 8px; background: #fff; color: #111827; border: 1px solid #e5e7eb; }
.preview-inner-pages span { display: inline-flex; margin-right: 6px; padding: 5px 8px; border-radius: 999px; background: #f3f4f6; color: #475467; font-size: 12px; }
.upload-line { width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.visual-preset-list { display: flex; flex-wrap: wrap; gap: 8px; }
.builder-inspector { max-height: calc(100vh - 128px); overflow: auto; }
.inspector-empty { min-height: 360px; display: grid; align-content: center; justify-items: start; gap: 12px; color: #667085; }
.inspector-empty h3 { margin: 0; color: #111827; }
.inspector-empty p { margin: 0; line-height: 1.6; }
.inspector-head { position: sticky; top: -16px; z-index: 4; display: flex; justify-content: space-between; gap: 12px; align-items: center; margin: -16px -16px 12px; padding: 14px 16px; border-bottom: 1px solid #e5e7eb; background: #fff; }
.inspector-head strong { display: block; color: #111827; }
.inspector-head span { display: block; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #667085; font-size: 12px; margin-top: 4px; }
.inspector-form { display: grid; gap: 4px; }
.compact-editor { display: grid; gap: 10px; margin-bottom: 14px; }
.compact-row { display: grid; grid-template-columns: minmax(82px, 1fr) minmax(110px, 1.2fr) 42px 34px; gap: 8px; align-items: center; }
.compact-row.nav-compact-row { grid-template-columns: minmax(78px, 1fr) 58px minmax(118px, 1.2fr) 56px 34px; }
.compact-row .el-button { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.compact-inner-row { grid-template-columns: 96px minmax(110px, 1fr) 64px 34px; }
.link-list { display: grid; gap: 10px; }
.link-row { display: grid; grid-template-columns: 92px 1fr; gap: 10px; align-items: center; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f8fafc; }
.link-row span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #475467; font-weight: 800; }
.link-row .el-button { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.compat-panel { display: grid; gap: 12px; }
.inspector-actions { position: sticky; bottom: -16px; z-index: 4; display: flex; justify-content: flex-end; gap: 8px; margin: 12px -16px -16px; padding: 12px 16px; border-top: 1px solid #e5e7eb; background: #fff; }
.health-dialog, .health-list, .link-picker { display: grid; gap: 14px; }
.health-empty { padding: 16px; border: 1px solid #bbf7d0; border-radius: 8px; background: #f0fdf4; color: #166534; font-weight: 700; line-height: 1.6; }
.health-item { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: start; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; background: #f8fafc; }
.health-item.error { border-color: #fecaca; background: #fef2f2; }
.health-item.warning { border-color: #fed7aa; background: #fff7ed; }
.health-item strong { color: #111827; }
.health-item p { margin: 4px 0 0; color: #475467; line-height: 1.55; }
.version-dialog, .template-dialog { display: grid; gap: 14px; }
.version-empty { padding: 16px; border: 1px dashed #d0d5dd; border-radius: 8px; background: #f8fafc; color: #667085; line-height: 1.6; }
.version-list, .template-list { display: grid; gap: 10px; }
.version-item, .template-item { display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: center; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.version-item strong, .template-item strong { display: block; color: #111827; }
.version-item span, .template-item span { display: block; margin-top: 4px; color: #667085; font-size: 12px; line-height: 1.5; }
.template-item p { margin: 6px 0 0; color: #475467; font-size: 13px; line-height: 1.55; }
.version-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.template-save-box, .template-list-box { display: grid; gap: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafafa; }
.template-save-head, .template-list-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.template-save-head strong, .template-list-head strong { color: #111827; }
.template-save-head span { color: #667085; font-size: 12px; }
.template-save-form { display: grid; gap: 2px; }
.template-description { margin-bottom: 0; }
.template-save-action { margin-top: 4px; }
.link-preview { display: grid; gap: 6px; padding: 12px; border: 1px solid #bfdbfe; border-radius: 8px; background: #eff6ff; color: #1d4ed8; }
.link-preview span { word-break: break-all; font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; }
.link-preview small { color: #4b5563; }
.drawer-save-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -8px 0 16px; padding: 12px; border: 1px solid #dbeafe; border-radius: 8px; background: #f8fbff; box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06); }
.drawer-save-bar strong { display: block; color: #111827; font-size: 14px; }
.drawer-save-bar span { display: block; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #667085; font-size: 12px; margin-top: 3px; }
.drawer-save-actions { display: flex; gap: 8px; flex-shrink: 0; }
.drawer-live-preview { position: fixed; top: 118px; right: 590px; z-index: 3000; width: 392px; max-width: calc(100vw - 640px); padding: 12px; border: 1px solid #fed7aa; border-radius: 12px; background: #fff7ed; box-shadow: 0 18px 46px rgba(15, 23, 42, 0.18); }
.drawer-live-preview-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 10px; }
.drawer-live-preview-head strong { color: #7c2d12; font-size: 14px; }
.drawer-live-preview-head span { color: #9a3412; font-size: 12px; text-align: right; }
.drawer-preview-canvas { max-height: calc(100vh - 220px); overflow: auto; padding: 12px; border-radius: 12px; background: #f8fafc; }
.drawer-preview-invalid { padding: 16px; border: 1px dashed #f97316; border-radius: 10px; background: #fff; color: #c2410c; font-weight: 700; }
.drawer-bottom-nav { position: static; margin-top: 0; }
.editor-tip { margin-bottom: 12px; }
.quick-editor { display: grid; gap: 10px; margin-bottom: 18px; }
.quick-row { display: grid; grid-template-columns: 120px 1fr 42px 34px; gap: 8px; align-items: center; }
.quick-row.nav-row { grid-template-columns: 92px 72px 92px minmax(150px, 1fr) 112px minmax(170px, 1fr) 42px 58px 34px; }
.quick-row.my-tool-row { grid-template-columns: 70px 110px 1fr 130px 42px 34px; }
.inner-page-row { display: grid; grid-template-columns: 110px 130px 1fr 120px 34px; gap: 8px; align-items: center; }
@media (max-width: 1280px) {
  .builder-layout { grid-template-columns: 180px minmax(300px, 1fr) 240px; }
  .module-palette { grid-column: 1; grid-row: 1 / span 2; }
  .section-list { grid-column: 2; grid-row: 1 / span 2; }
  .phone-preview { grid-column: 3; grid-row: 1; }
  .builder-inspector { grid-column: 3; grid-row: 2; }
  .phone-preview, .builder-inspector { top: 248px; max-height: calc(100vh - 264px); }
  .phone-preview { display: grid; padding: 12px; }
  .preview-panel-head { display: grid; gap: 8px; }
  .preview-panel-head span { font-size: 11px; }
  .preview-panel-actions { justify-content: flex-start; }
  .phone-preview .phone-frame { width: 220px; height: clamp(320px, calc(100vh - 450px), 420px); border-width: 8px; border-radius: 24px; }
  .phone-preview .phone-status { height: 22px; }
  .phone-preview .preview-scroll { padding: 10px; }
  .drawer-live-preview { display: none; }
}
@media (max-width: 1024px) {
  .builder-layout { grid-template-columns: 1fr; }
  .module-palette, .section-list, .phone-preview, .builder-inspector { grid-column: auto; grid-row: auto; }
  .module-palette, .section-list, .phone-preview, .builder-inspector { position: static; max-height: none; }
  .phone-preview .phone-frame { width: min(292px, 100%); height: 520px; }
}
</style>

