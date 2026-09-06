import { describe, it, expect } from 'vitest';
import { channelEconomics, ChannelOrderFact } from './activity-channel-economics';
import { normalizeOperationPlan, defaultOperationPlan } from './activity-operation';
const fact = (value: Partial<ChannelOrderFact>): ChannelOrderFact => ({ id: 1, userId: 1, channelId: 2, amountFen: 10000, refundFen: 0, eligible: true, paidAt: new Date('2026-09-01'), ...value });
describe('channel economics', () => {
  it('separates paid users, new customers, free and refunded orders', () => {
    const rows = channelEconomics([{ id: 2, name: '合作场地' }], [{ label: '投放', kind: 'cost', amountFen: 6000, channelId: 2 }], [fact({}), fact({ id: 2, userId: 2, refundFen: 5000 }), fact({ id: 3, userId: 3, refundFen: 10000 }), fact({ id: 4, amountFen: 0 }), fact({ id: 5, userId: 1 })], new Set([1]));
    expect(rows[1]).toMatchObject({ paidUsers: 2, newPaidUsers: 1, freeOrders: 1, fullyRefundedOrders: 1, netTicketFen: 25000, costPerPaidUserFen: 3000, costPerNewPaidUserFen: 6000 });
  });
  it('does not invent a zero acquisition cost without a valid denominator or full scope', () => {
    const rows = channelEconomics([{ id: 2, name: '渠道' }], [], [fact({ paidAt: null })], null);
    expect(rows[1].newPaidUsers).toBeNull(); expect(rows[1].costPerNewPaidUserFen).toBeNull();
    expect(rows[0].costPerPaidUserFen).toBeNull();
  });
  it('does not classify cancelled registrants as effective paid users', () => {
    const rows = channelEconomics([], [], [fact({ channelId: 0, eligible: false })], new Set());
    expect(rows[0]).toMatchObject({ netTicketFen: 10000, paidUsers: 0 });
  });
  it('validates channel allocation without breaking older ledger entries', () => {
    expect(normalizeOperationPlan(defaultOperationPlan()).entries).toEqual([]);
    for (const channelId of [-1, '1', 1.2]) expect(() => normalizeOperationPlan({ ...defaultOperationPlan(), entries: [{ kind: 'cost', label: '渠道', amountFen: 100, channelId }] })).toThrow();
    expect(() => normalizeOperationPlan({ ...defaultOperationPlan(), entries: [{ kind: 'income', label: '服务费', amountFen: 100, channelId: 1 }] })).toThrow();
  });
});
