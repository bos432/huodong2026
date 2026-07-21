export type MallCommissionRuleScope = "tenant" | "merchant" | "channel" | "product";

export type MallCommissionRuleCandidate = {
  id?: number | null;
  scopeType: MallCommissionRuleScope;
  merchantId?: number | null;
  productId?: number | null;
  promotionCodeId?: number | null;
  priority?: number | null;
  version?: number | null;
  directRateBps: number;
  agentLevelRatesBps?: number[] | null;
};

export type MallCommissionRuleContext = {
  merchantId?: number | null;
  productId?: number | null;
  promotionCodeId?: number | null;
};

export type MallCommissionBeneficiary = {
  beneficiaryType: "promoter" | "agent";
  beneficiaryId: number;
  level: number;
  rateBps: number;
};

const SCOPE_PRECEDENCE: Record<MallCommissionRuleScope, number> = {
  product: 400,
  channel: 300,
  merchant: 200,
  tenant: 100
};

export function selectMallCommissionRule<T extends MallCommissionRuleCandidate>(rules: T[], context: MallCommissionRuleContext): T | null {
  return rules
    .filter((rule) => {
      if (rule.scopeType === "product") return Boolean(context.productId) && rule.productId === context.productId;
      if (rule.scopeType === "channel") return Boolean(context.promotionCodeId) && rule.promotionCodeId === context.promotionCodeId;
      if (rule.scopeType === "merchant") return Boolean(context.merchantId) && rule.merchantId === context.merchantId;
      return rule.scopeType === "tenant";
    })
    .sort((left, right) => {
      return SCOPE_PRECEDENCE[right.scopeType] - SCOPE_PRECEDENCE[left.scopeType]
        || Number(right.priority || 0) - Number(left.priority || 0)
        || Number(right.version || 0) - Number(left.version || 0)
        || Number(right.id || 0) - Number(left.id || 0);
    })[0] || null;
}

export function allocateMallCommissionBaseFen(lineAmountsFen: number[], paidAmountFen: number) {
  const safeLines = lineAmountsFen.map((value) => Math.max(Math.trunc(value || 0), 0));
  const total = safeLines.reduce((sum, value) => sum + value, 0);
  const target = Math.min(Math.max(Math.trunc(paidAmountFen || 0), 0), total);
  if (!total || !target) return safeLines.map(() => 0);
  const rows = safeLines.map((amount, index) => {
    const numerator = amount * target;
    return { index, value: Math.floor(numerator / total), remainder: numerator % total };
  });
  let remaining = target - rows.reduce((sum, row) => sum + row.value, 0);
  rows.sort((left, right) => right.remainder - left.remainder || left.index - right.index);
  for (let index = 0; index < rows.length && remaining > 0; index += 1, remaining -= 1) rows[index].value += 1;
  return rows.sort((left, right) => left.index - right.index).map((row) => row.value);
}

export function buildMallCommissionBeneficiaries(input: {
  promoterUserId?: number | null;
  directAgentId?: number | null;
  parentAgentIds?: number[] | null;
  directRateBps: number;
  agentLevelRatesBps?: number[] | null;
}) {
  const rows: MallCommissionBeneficiary[] = [];
  const directRateBps = normalizeBps(input.directRateBps);
  const directAgentId = Number(input.directAgentId || 0) || null;
  if (input.promoterUserId && directRateBps > 0) {
    rows.push({ beneficiaryType: "promoter", beneficiaryId: Number(input.promoterUserId), level: 0, rateBps: directRateBps });
  } else if (directAgentId && directRateBps > 0) {
    rows.push({ beneficiaryType: "agent", beneficiaryId: directAgentId, level: 0, rateBps: directRateBps });
  }

  const agentChain = input.promoterUserId
    ? [directAgentId, ...(input.parentAgentIds || [])]
    : [...(input.parentAgentIds || [])];
  (input.agentLevelRatesBps || []).forEach((rate, index) => {
    const agentId = Number(agentChain[index] || 0);
    const rateBps = normalizeBps(rate);
    if (agentId && rateBps > 0 && !rows.some((row) => row.beneficiaryType === "agent" && row.beneficiaryId === agentId)) {
      rows.push({ beneficiaryType: "agent", beneficiaryId: agentId, level: index + 1, rateBps });
    }
  });
  return rows;
}

export function commissionAmountFen(baseAmountFen: number, rateBps: number) {
  return Math.floor(Math.max(Math.trunc(baseAmountFen || 0), 0) * normalizeBps(rateBps) / 10000);
}

export function refundedCommissionFen(originalCommissionFen: number, originalOrderFen: number, approvedRefundFen: number) {
  const original = Math.max(Math.trunc(originalCommissionFen || 0), 0);
  const order = Math.max(Math.trunc(originalOrderFen || 0), 0);
  if (!original || !order) return 0;
  const refunded = Math.min(Math.max(Math.trunc(approvedRefundFen || 0), 0), order);
  const remaining = order - refunded;
  return Math.floor(original * remaining / order);
}

function normalizeBps(value: number) {
  return Math.min(Math.max(Math.trunc(Number(value || 0)), 0), 10000);
}
