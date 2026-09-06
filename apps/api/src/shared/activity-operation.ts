export type OperationEntry = { label: string; kind: 'cost' | 'income'; amountFen: number; channelId?: number | null };
export type OperationPlan = {
  mode: 'self' | 'partner'; owner: string; budgetFen: number; targetRevenueFen: number;
  entries: OperationEntry[]; checklist: { label: string; done: boolean }[]; note: string;
};

export function normalizeOperationPlan(value: unknown): OperationPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('经营台账格式不正确');
  const body = value as Record<string, any>;
  const money = (v: unknown) => {
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0 || v > 100_000_000_00) throw new Error('金额须为非负整数分，且不超过一亿元');
    return v;
  };
  const text = (v: unknown, max: number, required = false) => {
    if (typeof v !== 'string' || v.length > max || (required && !v.trim())) throw new Error('请检查负责人、条目名称和备注长度');
    return v.trim();
  };
  if (!['self', 'partner'].includes(body.mode)) throw new Error('请选择自营或合作模式');
  if (!Array.isArray(body.entries) || body.entries.length > 100 || !Array.isArray(body.checklist) || body.checklist.length > 30) throw new Error('收支最多100项，待办最多30项');
  return {
    mode: body.mode, owner: text(body.owner, 80), budgetFen: money(body.budgetFen), targetRevenueFen: money(body.targetRevenueFen), note: text(body.note, 2000),
    entries: body.entries.map((e: any) => {
      if (!e || !['cost', 'income'].includes(e.kind)) throw new Error('收支类型不正确');
      if (e.channelId !== undefined && e.channelId !== null && (!Number.isSafeInteger(e.channelId) || e.channelId < 0 || e.kind !== 'cost')) throw new Error('仅成本可以归属渠道，渠道编号必须有效');
      return { label: text(e.label, 120, true), kind: e.kind, amountFen: money(e.amountFen), ...(e.channelId === undefined ? {} : { channelId: e.channelId }) };
    }),
    checklist: body.checklist.map((e: any) => {
      if (!e || typeof e.done !== 'boolean') throw new Error('待办状态不正确');
      return { label: text(e.label, 160, true), done: e.done };
    })
  };
}

export function operationSummary(plan: OperationPlan, ticketGrossFen: number, refundFen: number) {
  const costsFen = plan.entries.filter(e => e.kind === 'cost').reduce((sum, e) => sum + e.amountFen, 0);
  const manualIncomeFen = plan.entries.filter(e => e.kind === 'income').reduce((sum, e) => sum + e.amountFen, 0);
  const ticketNetFen = ticketGrossFen - refundFen;
  const incomeFen = manualIncomeFen + (plan.mode === 'self' ? ticketNetFen : 0);
  return { ticketGrossFen, refundFen, ticketNetFen, costsFen, manualIncomeFen, incomeFen, contributionFen: incomeFen - costsFen,
    budgetRemainingFen: plan.budgetFen - costsFen, incompleteTasks: plan.checklist.filter(e => !e.done).length };
}

export function defaultOperationPlan(): OperationPlan {
  return { mode: 'self', owner: '', budgetFen: 0, targetRevenueFen: 0, entries: [], note: '', checklist: [
    '确定活动负责人和合作方', '确认时间与场地', '确认成本、价格和退款规则', '确认封面素材授权',
    '确认成团截止与取消预案', '检查通知和群二维码', '确认现场签到与安全安排', '活动后复盘与跟进'
  ].map(label => ({ label, done: false })) };
}
