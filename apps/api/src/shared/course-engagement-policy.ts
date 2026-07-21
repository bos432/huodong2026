export function courseCertificateEligible(input: { progress: number; threshold: number; requireAssessmentPass: boolean; publishedAssessments: number; passedAssessments: number }) {
  const threshold = Math.min(Math.max(Math.trunc(Number(input.threshold || 100)), 1), 100);
  if (Number(input.progress || 0) < threshold) return false;
  if (!input.requireAssessmentPass) return true;
  return input.publishedAssessments > 0 && input.passedAssessments >= input.publishedAssessments;
}

export function courseRefundOutcome(input: { orderAmountFen: number; refundedBeforeFen: number; refundAmountFen: number }) {
  const orderAmountFen = Math.max(Math.trunc(Number(input.orderAmountFen || 0)), 0);
  const refundedBeforeFen = Math.max(Math.trunc(Number(input.refundedBeforeFen || 0)), 0);
  const refundAmountFen = Math.trunc(Number(input.refundAmountFen || 0));
  if (refundAmountFen <= 0) throw new Error("退款金额必须大于 0");
  if (refundedBeforeFen + refundAmountFen > orderAmountFen) throw new Error("退款金额超过可退金额");
  const totalRefundedFen = refundedBeforeFen + refundAmountFen;
  return { totalRefundedFen, fullRefund: totalRefundedFen >= orderAmountFen, revokeAccess: totalRefundedFen >= orderAmountFen };
}
