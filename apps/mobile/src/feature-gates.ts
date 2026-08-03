import { ref } from "vue";
import { getCurrentTenantCode, request, withTenantCode } from "./api";

type HomepageSectionView = {
  id: number;
  type: string;
  enabled?: boolean;
  sortOrder?: number;
  config?: Record<string, any>;
  [key: string]: any;
};

export type FeatureGateKey =
  | "courses"
  | "userContentSharing"
  | "community"
  | "communityPublish"
  | "forum"
  | "forumPost"
  | "mall"
  | "charity"
  | "volunteer"
  | "certificates"
  | "ambassador"
  | "partner"
  | "adCenter"
  | "agentSettlement";

export type FeatureGates = Record<FeatureGateKey, boolean>;

const FEATURE_GATES_STORAGE_KEY = "mp_feature_gates";
let featureDisabledDialogOpen = false;

export const defaultFeatureGates: FeatureGates = {
  courses: true,
  userContentSharing: true,
  community: true,
  communityPublish: true,
  forum: true,
  forumPost: true,
  mall: true,
  charity: true,
  volunteer: true,
  certificates: true,
  ambassador: true,
  partner: true,
  adCenter: true,
  agentSettlement: true
};

const featureGateLabels: Record<FeatureGateKey, string> = {
  courses: "专题内容",
  userContentSharing: "用户内容发布与分享",
  community: "共修动态",
  communityPublish: "发布心得",
  forum: "共修论坛",
  forumPost: "论坛发帖",
  mall: "商城",
  charity: "公益池",
  volunteer: "志愿服务",
  certificates: "证书",
  ambassador: "文化大使",
  partner: "城市合伙人",
  adCenter: "广告",
  agentSettlement: "代理结算"
};

const featureGateKeys = Object.keys(defaultFeatureGates) as FeatureGateKey[];

export const featureGatesState = ref<FeatureGates>({ ...defaultFeatureGates });

let loadedTenantCode = "";
let loadingRequest: { tenantCode: string; promise: Promise<FeatureGates> } | null = null;

function normalizePath(url?: string) {
  const text = String(url || "").trim();
  if (!text) return "";
  const path = text.split("?")[0];
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeFeatureGates(value: unknown): FeatureGates {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result: FeatureGates = { ...defaultFeatureGates };
  for (const key of featureGateKeys) {
    const raw = input[key];
    if (typeof raw === "boolean") result[key] = raw;
    else if (typeof raw === "string") {
      const normalized = raw.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) result[key] = true;
      if (["false", "0", "no", "off"].includes(normalized)) result[key] = false;
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      result[key] = raw !== 0;
    }
  }
  return result;
}

function readStoredFeatureGates() {
  try {
    const stored = uni.getStorageSync(FEATURE_GATES_STORAGE_KEY);
    if (!stored || typeof stored !== "object") return null;
    const payload = stored as { tenantCode?: string; gates?: unknown };
    if (String(payload.tenantCode || "") !== getCurrentTenantCode()) return null;
    return normalizeFeatureGates(payload.gates);
  } catch {
    return null;
  }
}

function writeStoredFeatureGates(gates: FeatureGates, tenantCode = getCurrentTenantCode()) {
  try {
    uni.setStorageSync(FEATURE_GATES_STORAGE_KEY, { tenantCode, gates, updatedAt: Date.now() });
  } catch {
    // Storage failure should not block navigation.
  }
}

export function hydrateFeatureGatesFromStorage() {
  const stored = readStoredFeatureGates();
  if (stored) featureGatesState.value = stored;
  return featureGatesState.value;
}

export async function loadFeatureGates(force = false) {
  const tenantCode = getCurrentTenantCode();
  if (!force && loadedTenantCode === tenantCode) return featureGatesState.value;
  const stored = readStoredFeatureGates();
  if (!force && stored) {
    loadedTenantCode = tenantCode;
    featureGatesState.value = stored;
    return stored;
  }
  if (loadingRequest?.tenantCode === tenantCode) return loadingRequest.promise;
  let promise!: Promise<FeatureGates>;
  promise = request<{ launchConfig?: { featureGates?: unknown } }>("/public/settings/operation")
    .then((setting) => {
      const gates = normalizeFeatureGates(setting?.launchConfig?.featureGates);
      if (getCurrentTenantCode() === tenantCode) {
        loadedTenantCode = tenantCode;
        featureGatesState.value = gates;
        writeStoredFeatureGates(gates, tenantCode);
      }
      if (loadingRequest?.promise === promise) loadingRequest = null;
      return gates;
    })
    .catch(() => {
      const fallback = stored || { ...defaultFeatureGates };
      if (getCurrentTenantCode() === tenantCode) featureGatesState.value = fallback;
      if (loadingRequest?.promise === promise) loadingRequest = null;
      return fallback;
    });
  loadingRequest = { tenantCode, promise };
  return promise;
}

export function featureGateForLink(url?: string): FeatureGateKey | null {
  const path = normalizePath(url);
  if (!path) return null;
  if (path === "/pages/forum/publish") return "forumPost";
  if (path.startsWith("/pages/forum/") || path === "/pages/user/forum-posts") return "userContentSharing";
  if (path === "/pages/community/publish" || path === "/pages/community/checkin") return "communityPublish";
  if (path.startsWith("/pages/community/") || ["/pages/user/community-posts", "/pages/user/community-social", "/pages/user/content-appeals"].includes(path)) return "userContentSharing";
  if (path.startsWith("/pages/courses/") || path.startsWith("/pages/course/") || ["/pages/search/index", "/pages/user/courses", "/pages/user/learning", "/pages/user/favorites"].includes(path)) return "courses";
  if (path.startsWith("/pages/mall/") || path === "/pages/user/mall-orders" || path === "/pages/user/mall-order-detail") return "mall";
  if (path.startsWith("/pages/charity/") || path === "/pages/apply/aid") return "charity";
  if (path.startsWith("/pages/volunteer/")) return "volunteer";
  if (path === "/pages/user/certificates") return "certificates";
  if (path.startsWith("/pages/ambassador/") || path === "/pages/apply/ambassador") return "ambassador";
  if (path === "/pages/partner/index" || path === "/pages/recruit/dean") return "partner";
  return null;
}

export function isLinkAllowedByFeature(url?: string) {
  const gate = featureGateForLink(url);
  if (!gate) return true;
  if (gate === "forumPost") return featureGatesState.value.userContentSharing !== false && featureGatesState.value.forum !== false && featureGatesState.value.forumPost !== false;
  if (gate === "communityPublish") return featureGatesState.value.userContentSharing !== false && featureGatesState.value.community !== false && featureGatesState.value.communityPublish !== false;
  if (gate === "userContentSharing") {
    const path = normalizePath(url);
    const forumPath = path.startsWith("/pages/forum/") || path === "/pages/user/forum-posts";
    return featureGatesState.value.userContentSharing !== false && (forumPath ? featureGatesState.value.forum !== false : featureGatesState.value.community !== false);
  }
  return featureGatesState.value[gate] !== false;
}

export function featureDisabledText(url?: string) {
  const gate = featureGateForLink(url);
  return gate ? `${featureGateLabels[gate]}暂未开放` : "该功能暂未开放";
}

export function showFeatureDisabledToast(url?: string) {
  uni.showToast({ title: featureDisabledText(url), icon: "none" });
}

export function showFeatureDisabledDialog(url?: string, onConfirm?: () => void) {
  if (featureDisabledDialogOpen) return;
  featureDisabledDialogOpen = true;
  uni.showModal({
    title: "暂时无法使用",
    content: `${featureDisabledText(url)}。请稍后再试或联系主办方。`,
    showCancel: false,
    confirmText: "我知道了",
    success: () => {
      featureDisabledDialogOpen = false;
      onConfirm?.();
    },
    fail: () => { featureDisabledDialogOpen = false; }
  });
}

export function filterNavigationItemsByFeature(items: any[]) {
  return items.filter((item) => isLinkAllowedByFeature(item?.link || item?.path));
}

export function filterDecorationSectionsByFeature(sections: HomepageSectionView[]) {
  return sections
    .map((section) => {
      if (section.type === "quick_nav") {
        const items = Array.isArray(section.config?.items) ? filterNavigationItemsByFeature(section.config.items) : [];
        return items.length ? { ...section, config: { ...(section.config || {}), items } } : null;
      }
      if (section.type === "charity_summary" && featureGatesState.value.charity === false) return null;
      if (section.type === "course_recommendations" && featureGatesState.value.courses === false) return null;
      if (section.type === "mall_showcase" && featureGatesState.value.mall === false) return null;
      if (["testimonial_feed", "featured_testimonials", "activity_testimonials"].includes(section.type) && (featureGatesState.value.userContentSharing === false || featureGatesState.value.community === false)) return null;
      const link = String(section.config?.primaryButtonLink || section.config?.link || "");
      if (link && !isLinkAllowedByFeature(link)) return null;
      return section;
    })
    .filter(Boolean) as HomepageSectionView[];
}

export function guardCurrentPageFeature() {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const path = page?.route ? `/${page.route}` : "";
  if (!path || isLinkAllowedByFeature(path)) return true;
  showFeatureDisabledDialog(path, () => {
    if (pages.length > 1) uni.navigateBack();
    else uni.reLaunch({ url: withTenantCode("/pages/index/index") });
  });
  return false;
}
