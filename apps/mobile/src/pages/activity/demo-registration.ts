export const DEMO_SHOWCASE_TENANT = "qiwai-showcase";

export function isDemoRegistration(tenantCode: string, detail: { isTest?: boolean; title?: string } | null | undefined) {
  return tenantCode === DEMO_SHOWCASE_TENANT && Boolean(detail?.isTest || String(detail?.title || "").startsWith("【演示】"));
}

export function demoRegistrationResult(activityTitle: string) {
  return {
    title: activityTitle,
    message: "演示报名已完成 · 仅保存在当前页面，不会创建真实报名、订单或收款。"
  };
}
