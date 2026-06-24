import { computed, ref } from "vue";
import { request, setActivityListIntentFromUrl, withTenantCode } from "./api";
import type { HomepagePayload, HomepageSectionView } from "@activity/shared";

type InnerPageConfig = {
  key: string;
  title: string;
  subtitle: string;
  showBottomNav?: boolean;
};

const globalSingletonTypes = ["bottom_nav", "my_page", "inner_pages"];

const defaultBottomNavSection: HomepageSectionView = {
  id: -900,
  pageKey: "home",
  type: "bottom_nav",
  title: "前台底部导航",
  subtitle: null,
  enabled: true,
  sortOrder: 90,
  config: {
    items: [
      { label: "慢π", icon: "π", activeIcon: "π", link: "/pages/index/index", action: "mainPage", color: "#C43D3D", enabled: true },
      { label: "课程", icon: "课", activeIcon: "课", link: "/pages/courses/index", action: "mainPage", color: "#C43D3D", enabled: true },
      { label: "共修", icon: "修", activeIcon: "修", link: "/pages/community/index", action: "mainPage", color: "#C43D3D", enabled: true },
      { label: "活动", icon: "活", activeIcon: "活", link: "/pages/activity/list", action: "mainPage", color: "#C43D3D", enabled: true },
      { label: "我的", icon: "我", activeIcon: "我", link: "/pages/user/my", action: "mainPage", color: "#C43D3D", enabled: true }
    ]
  },
  layout: { backgroundColor: "#ffffff", activeColor: "#C43D3D", textColor: "#667085" }
};

const defaultInnerPagesSection: HomepageSectionView = {
  id: -901,
  pageKey: "home",
  type: "inner_pages",
  title: "内页布局",
  subtitle: null,
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
      { key: "partner_page", title: "城市合伙人", subtitle: "适合文化空间、书院、培训机构和本地社群运营者，用 SaaS 后台独立发布活动、收款对账和沉淀会员。", showBottomNav: true }
    ]
  },
  layout: {
    headerBackgroundColor: "#ffffff",
    headerTextColor: "#111827",
    headerSubtitleColor: "#667085",
    stickyFilterBackground: "#f4f6f8",
    actionBarBackgroundColor: "#ffffff"
  }
};

function normalizeLink(url?: string) {
  return String(url || "").split("?")[0];
}

function normalizeDecorationSections(list: HomepageSectionView[]) {
  const latestSingleton = new Map<string, HomepageSectionView>();
  for (const item of list) {
    if (globalSingletonTypes.includes(item.type)) latestSingleton.set(item.type, item);
  }
  return list.filter((item) => !globalSingletonTypes.includes(item.type) || latestSingleton.get(item.type) === item);
}

export function isTabUrl(url?: string) {
  return ["/pages/index/index", "/pages/courses/index", "/pages/community/index", "/pages/activity/list", "/pages/user/my"].includes(normalizeLink(url));
}

export function quickInitial(label?: string, icon?: string) {
  return String(icon || label || "入").slice(0, 1);
}

export function goDecoratedLink(url?: string, action?: string) {
  if (!url) return;
  if (normalizeLink(url) === "/pages/activity/list") {
    setActivityListIntentFromUrl(url, { categoryId: "all" });
    uni.reLaunch({ url: withTenantCode("/pages/activity/list") });
  } else if (action === "switchTab" || action === "mainPage" || isTabUrl(url)) uni.reLaunch({ url: withTenantCode(normalizeLink(url)) });
  else uni.navigateTo({ url: withTenantCode(url) });
}

export function usePageDecoration(pageKeyOrPath: string, currentPathOrPageKey: string) {
  const legacyOrder = pageKeyOrPath.startsWith("/pages/");
  const pageKey = legacyOrder ? currentPathOrPageKey : pageKeyOrPath;
  const currentPath = legacyOrder ? pageKeyOrPath : currentPathOrPageKey;
  const sections = ref<HomepageSectionView[]>([]);
  const tenant = ref<HomepagePayload["tenant"] | null>(null);
  const loadFailed = ref(false);

  const bottomNavSection = computed(() => sections.value.find((item) => item.type === "bottom_nav") || (loadFailed.value ? defaultBottomNavSection : null));
  const innerPagesSection = computed(() => sections.value.find((item) => item.enabled && item.type === "inner_pages") || defaultInnerPagesSection);
  const innerPageLayout = computed<Record<string, any>>(() => ({ ...defaultInnerPagesSection.layout, ...(innerPagesSection.value.layout || {}) }));
  const innerPageConfig = computed<InnerPageConfig>(() => {
    const pages = Array.isArray(innerPagesSection.value.config.pages) ? innerPagesSection.value.config.pages : [];
    return (pages.find((item: any) => item?.key === pageKey) as InnerPageConfig | undefined) || (defaultInnerPagesSection.config.pages as InnerPageConfig[]).find((item) => item.key === pageKey) || { key: pageKey, title: "", subtitle: "", showBottomNav: true };
  });
  const showBottomNav = computed(() => innerPageConfig.value.showBottomNav !== false && Boolean(bottomNavSection.value?.enabled));
  const contentSections = computed(() => sections.value
    .filter((item) => item.enabled && !["bottom_nav", "my_page", "inner_pages"].includes(item.type))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));

  async function loadDecoration() {
    try {
      loadFailed.value = false;
      const endpoint = pageKey === "home" ? "/public/homepage" : `/public/page-decoration?pageKey=${encodeURIComponent(pageKey)}`;
      const payload = await request<HomepagePayload>(endpoint);
      const pageSections = normalizeDecorationSections(payload.sections || []);
      if (pageKey === "home") {
        sections.value = pageSections;
      } else {
        const homePayload = await request<HomepagePayload>("/public/homepage").catch(() => null);
        const homeSections = normalizeDecorationSections(homePayload?.sections || []);
        const localSections = payload.fallback ? pageSections.filter((item) => !globalSingletonTypes.includes(item.type)) : pageSections;
        const inherited = homeSections.filter((item) => globalSingletonTypes.includes(item.type) && !localSections.some((pageItem) => pageItem.type === item.type));
        sections.value = [...localSections, ...inherited];
      }
      tenant.value = payload.tenant || null;
    } catch {
      sections.value = [];
      tenant.value = null;
      loadFailed.value = true;
    }
  }

  function isCurrentNav(url?: string) {
    return normalizeLink(url) === currentPath;
  }

  return {
    sections,
    tenant,
    bottomNavSection,
    contentSections,
    innerPageConfig,
    innerPageLayout,
    showBottomNav,
    loadDecoration,
    goLink: goDecoratedLink,
    isCurrentNav,
    quickInitial
  };
}

export const useHomepageDecoration = usePageDecoration;
