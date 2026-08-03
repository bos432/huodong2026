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

export const featureGateDependencies: Partial<Record<FeatureGateKey, FeatureGateKey>> = {
  community: "userContentSharing",
  forum: "userContentSharing",
  communityPublish: "community",
  forumPost: "forum"
};

export const featureGateItems: Array<{ key: FeatureGateKey; label: string; description: string }> = [
  { key: "courses", label: "专题/课程", description: "前台专题、课程详情、我的内容和学习记录。" },
  { key: "userContentSharing", label: "用户内容发布与分享", description: "控制发布心得、图片、活动动态、公开分享及相关用户内容入口；关闭后适合微信过审版本。" },
  { key: "community", label: "共修动态/心得", description: "前台共修动态、活动心得和我的心得。" },
  { key: "communityPublish", label: "发布心得/打卡", description: "用户发布活动心得、打卡任务入口；依赖共修动态/心得。" },
  { key: "forum", label: "论坛浏览", description: "关闭后隐藏论坛首页、帖子详情和我的论坛入口。" },
  { key: "forumPost", label: "论坛发帖", description: "控制发帖、回复和互动投稿；依赖论坛浏览。" },
  { key: "mall", label: "商城", description: "商城、购物车、商城订单、优惠券和商品入口。" },
  { key: "charity", label: "公益池", description: "公益池公示、我的公益贡献和帮扶申请。" },
  { key: "volunteer", label: "志愿服务", description: "志愿任务、报名和服务记录入口。" },
  { key: "certificates", label: "我的证书", description: "证书列表、详情、下载和核验入口。" },
  { key: "ambassador", label: "文化大使", description: "大使主页、申请、案例和招募入口。" },
  { key: "partner", label: "城市合伙人", description: "城市合伙人、院长招募等招商入口。" },
  { key: "adCenter", label: "广告/招商", description: "前台广告位和后台广告中心。" },
  { key: "agentSettlement", label: "代理结算", description: "商家代理结算和转账相关入口。" }
];

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

export const conservativeFeatureGates: FeatureGates = {
  courses: false,
  userContentSharing: false,
  community: false,
  communityPublish: false,
  forum: false,
  forumPost: false,
  mall: false,
  charity: false,
  volunteer: false,
  certificates: false,
  ambassador: false,
  partner: false,
  adCenter: false,
  agentSettlement: false
};

const STORAGE_KEY = "admin_feature_gates";
const featureGateKeys = featureGateItems.map((item) => item.key);

export function normalizeFeatureGates(value: unknown): FeatureGates {
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
  for (const [child, parent] of Object.entries(featureGateDependencies) as Array<[FeatureGateKey, FeatureGateKey]>) {
    if (!result[parent]) result[child] = false;
  }
  return result;
}

export function readStoredFeatureGates() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeFeatureGates(JSON.parse(stored)) : { ...defaultFeatureGates };
  } catch {
    return { ...defaultFeatureGates };
  }
}

export function writeStoredFeatureGates(value: unknown) {
  const gates = normalizeFeatureGates(value);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gates));
  return gates;
}

export function adminFeatureGateForPath(path?: string): FeatureGateKey | null {
  const target = String(path || "").split("?")[0];
  if (target.startsWith("/mall-")) return "mall";
  if (target === "/courses") return "courses";
  if (target === "/community") return "community";
  if (target === "/charity") return "charity";
  if (target === "/volunteers") return "volunteer";
  if (target === "/ambassador") return "ambassador";
  if (target === "/ad-center") return "adCenter";
  if (target === "/agent-settlements") return "agentSettlement";
  return null;
}

function tenantEntitlementForGate(gate: FeatureGateKey) {
  const mapping: Partial<Record<FeatureGateKey, string>> = {
    adCenter: "ads",
    agentSettlement: "agentSettlement"
  };
  return mapping[gate] || null;
}

function currentTenantEntitlements() {
  try {
    const settings = JSON.parse(localStorage.getItem("admin_tenant_settings") || "null");
    return settings?.entitlements?.features && typeof settings.entitlements.features === "object" ? settings.entitlements.features as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function isAdminFeaturePathEnabled(path: string, platformAdmin: boolean, gates = readStoredFeatureGates()) {
  if (platformAdmin) return true;
  const gate = adminFeatureGateForPath(path);
  if (!gate) return true;
  if (gates[gate] === false) return false;
  const entitlement = tenantEntitlementForGate(gate);
  return !entitlement || currentTenantEntitlements()[entitlement] !== false;
}
