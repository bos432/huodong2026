export type TenantOperationHealthStatus = "healthy" | "watch" | "risk";

export type TenantOperationHealthInput = {
  enabled: boolean;
  subscriptionStatus?: { status?: string; daysRemaining?: number | null } | null;
  enabledAdminCount: number;
  enabledPaymentAccountCount: number;
  totalActivityCount: number;
  totalCourseCount: number;
  publishedCourseCount: number;
  homepageSectionCount: number;
  pendingActivityCount: number;
  pendingRegistrationCount: number;
  pendingRefundCount: number;
  callbackRiskCount: number;
  pendingReconciliationCount: number;
};

export function tenantOperationHealth(input: TenantOperationHealthInput) {
  const risks: string[] = [];
  const warnings: string[] = [];
  const actions: string[] = [];

  if (!input.enabled) risks.push("商家已停用");
  if (input.subscriptionStatus?.status === "expired") risks.push("商家套餐已到期");
  if (Number(input.enabledAdminCount || 0) <= 0) risks.push("缺少可登录商家管理员");
  if (Number(input.enabledPaymentAccountCount || 0) <= 0) risks.push("缺少启用的收款账户");
  if (Number(input.totalActivityCount || 0) <= 0) risks.push("尚未创建活动");
  if (Number(input.callbackRiskCount || 0) > 0) risks.push(`存在 ${input.callbackRiskCount} 条异常支付回调`);
  if (Number(input.pendingReconciliationCount || 0) > 0) risks.push(`存在 ${input.pendingReconciliationCount} 笔待处理对账差异`);
  if (Number(input.pendingRefundCount || 0) > 0) warnings.push(`有 ${input.pendingRefundCount} 个待处理退款`);

  if (Number(input.homepageSectionCount || 0) <= 0) warnings.push("首页装修未启用模块");
  if (Number(input.totalCourseCount || 0) <= 0) warnings.push("尚未配置课程内容");
  else if (Number(input.publishedCourseCount || 0) <= 0) warnings.push("课程均未发布");
  if (input.subscriptionStatus?.status === "expiring_soon") warnings.push(`商家套餐 ${input.subscriptionStatus.daysRemaining ?? "-"} 天后到期`);
  if (Number(input.pendingActivityCount || 0) > 0) warnings.push(`有 ${input.pendingActivityCount} 个待审核活动`);
  if (Number(input.pendingRegistrationCount || 0) > 0) warnings.push(`有 ${input.pendingRegistrationCount} 个待审核报名`);

  actions.push(...risks, ...warnings);
  const score = Math.max(0, Math.min(100, 100 - risks.length * 18 - warnings.length * 8));
  const status: TenantOperationHealthStatus = risks.length ? "risk" : warnings.length ? "watch" : "healthy";
  const label = status === "healthy" ? "健康" : status === "watch" ? "观察" : "风险";

  return {
    score,
    status,
    label,
    risks,
    warnings,
    actions: actions.slice(0, 6)
  };
}
