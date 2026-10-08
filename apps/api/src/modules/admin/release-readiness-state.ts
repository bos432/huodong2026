export type ReleaseReadinessStatus = "unconfigured" | "configured" | "external_pending" | "accepted" | "blocked" | "expired";
export type ReleaseReadinessAction = "save" | "check" | "verify" | "block";

export const RELEASE_READINESS_ITEMS = [
  { key: "payment_config", category: "支付配置", label: "支付配置" },
  { key: "payment_callbacks", category: "支付/退款回调", label: "支付/退款回调" },
  { key: "sms", category: "短信配置", label: "短信配置" },
  { key: "wechat_subscription", category: "微信订阅消息", label: "微信订阅消息" },
  { key: "miniprogram_acceptance", category: "真机与体验版验收", label: "真机与体验版验收" },
  { key: "test_fixtures", category: "测试账号与测试订单", label: "测试账号与测试订单" }
] as const;

export type ReadinessDecisionItem = { itemKey: string; label: string; status: string };

const STATUS_LABELS: Record<string, string> = {
  unconfigured: "未登记验收状态",
  configured: "已配置，等待外部验收",
  external_pending: "外部验收中",
  blocked: "已阻塞",
  expired: "已过期"
};

export function readinessDecision(items: ReadinessDecisionItem[]) {
  const byKey = new Map(items.map((item) => [item.itemKey, item]));
  const blockers = RELEASE_READINESS_ITEMS.flatMap(({ key, label }) => {
    const item = byKey.get(key);
    if (!item) return [`${label}：未登记验收状态`];
    if (item.status === "accepted") return [];
    return [`${item.label || label}：${STATUS_LABELS[item.status] || "状态未完成"}`];
  });
  return { ready: blockers.length === 0, blockers };
}

export function nextReleaseReadinessStatus(status: ReleaseReadinessStatus, action: ReleaseReadinessAction): ReleaseReadinessStatus {
  if (action === "save") return "configured";
  if (action === "check") return "external_pending";
  if (action === "verify") {
    if (status !== "external_pending") throw new Error("必须先完成外部验收证据");
    return "accepted";
  }
  return "blocked";
}

export function sanitizeReleaseEvidence(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !/(secret|password|token|private.?key|api.?key|apiv\d*key|credential)/i.test(key)).map(([key, item]) => {
    if (key.toLowerCase().includes("phone") && typeof item === "string") return [key, `***${item.slice(-4)}`];
    return [key, item];
  }));
}
