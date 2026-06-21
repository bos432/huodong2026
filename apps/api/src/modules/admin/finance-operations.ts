export type FinanceRiskLevel = "info" | "warning" | "danger";

export interface FinanceDailyMetrics {
  paidOrderCount: number;
  pendingOrderCount: number;
  refundCount: number;
  pendingRefundCount: number;
  paidAmount: number;
  refundAmount: number;
}

export interface FinanceRiskMetrics extends FinanceDailyMetrics {
  pendingReconciliationCount: number;
  pendingStatementCount: number;
  failedCallbackCount: number;
}

export function financeDailyReport(metrics: FinanceDailyMetrics, generatedAt = new Date()) {
  const refundRate = metrics.paidAmount > 0 ? metrics.refundAmount / metrics.paidAmount : 0;
  return {
    generatedAt: generatedAt.toISOString(),
    paidOrderCount: metrics.paidOrderCount,
    pendingOrderCount: metrics.pendingOrderCount,
    refundCount: metrics.refundCount,
    pendingRefundCount: metrics.pendingRefundCount,
    paidAmount: metrics.paidAmount.toFixed(2),
    refundAmount: metrics.refundAmount.toFixed(2),
    netAmount: (metrics.paidAmount - metrics.refundAmount).toFixed(2),
    refundRate: refundRate.toFixed(4),
    refundRatePercent: (refundRate * 100).toFixed(2),
    status: dailyReportStatus(metrics, refundRate)
  };
}

export function financeRiskAlerts(metrics: FinanceRiskMetrics) {
  const alerts: Array<{ key: string; level: FinanceRiskLevel; title: string; description: string; action: string }> = [];
  const refundRate = metrics.paidAmount > 0 ? metrics.refundAmount / metrics.paidAmount : 0;

  if (metrics.pendingRefundCount > 0) {
    alerts.push({
      key: "pending_refunds",
      level: metrics.pendingRefundCount >= 5 ? "danger" : "warning",
      title: `有 ${metrics.pendingRefundCount} 笔退款待审核`,
      description: "退款未处理会影响客服响应、活动复盘和商家结算。",
      action: "进入退款审核，先处理金额较大或等待时间较长的申请"
    });
  }

  if (metrics.pendingReconciliationCount > 0) {
    alerts.push({
      key: "pending_reconciliation",
      level: "danger",
      title: `有 ${metrics.pendingReconciliationCount} 笔支付对账差异`,
      description: "对账差异可能导致重复确认、漏确认或结算金额不准。",
      action: "导入或拉取服务商账单后扫描对账，并标记人工处理结果"
    });
  }

  if (metrics.failedCallbackCount > 0) {
    alerts.push({
      key: "failed_callbacks",
      level: "danger",
      title: `有 ${metrics.failedCallbackCount} 条失败支付回调`,
      description: "失败回调可能让用户已支付但订单未及时更新。",
      action: "核对回调验签、金额和订单状态，必要时补录支付确认"
    });
  }

  if (metrics.pendingStatementCount > 0) {
    alerts.push({
      key: "pending_statements",
      level: "warning",
      title: `有 ${metrics.pendingStatementCount} 条服务商账单待处理`,
      description: "账单未匹配会影响日报可信度和后续结算。",
      action: "完成账单匹配，确认未知订单和金额差异"
    });
  }

  if (refundRate >= 0.2 && metrics.refundCount >= 3) {
    alerts.push({
      key: "high_refund_rate",
      level: refundRate >= 0.35 ? "danger" : "warning",
      title: `今日退款率 ${Math.round(refundRate * 10000) / 100}% 偏高`,
      description: "退款率持续偏高通常意味着活动预期、价格、名额或客服沟通存在问题。",
      action: "查看退款原因，联动活动复盘和客服记录调整后续活动"
    });
  }

  if (metrics.pendingOrderCount >= 10) {
    alerts.push({
      key: "pending_payments",
      level: "info",
      title: `今日仍有 ${metrics.pendingOrderCount} 笔订单待支付`,
      description: "待支付订单过多会占用名额，也会拉低报名转化。",
      action: "检查关单任务、支付说明和客服提醒是否正常"
    });
  }

  return alerts;
}

function dailyReportStatus(metrics: FinanceDailyMetrics, refundRate: number) {
  if (metrics.pendingRefundCount >= 5 || refundRate >= 0.35) return "danger";
  if (metrics.pendingRefundCount > 0 || refundRate >= 0.2 || metrics.pendingOrderCount >= 10) return "warning";
  return "ok";
}
