import type { OperationEntry } from './activity-operation';

export type ChannelOrderFact = { id: number; userId: number; channelId: number; amountFen: number; refundFen: number; eligible: boolean; paidAt: Date | null };
export function channelEconomics(channels: Array<{ id: number; name: string }>, entries: OperationEntry[], orders: ChannelOrderFact[], firstPaidOrderIds: Set<number> | null) {
  const rows = [{ id: 0, name: '未归因 / 自然访问' }, ...channels];
  return rows.map(channel => {
    const facts = orders.filter(order => order.channelId === channel.id);
    const effective = facts.filter(order => order.eligible && order.amountFen > order.refundFen && order.amountFen > 0);
    const users = new Set(effective.map(order => order.userId));
    const unknownPaidAtCount = effective.filter(order => !order.paidAt).length;
    const newUsers = firstPaidOrderIds ? new Set(effective.filter(order => firstPaidOrderIds.has(order.id)).map(order => order.userId)).size : null;
    const costFen = entries.filter(entry => entry.kind === 'cost' && entry.channelId === channel.id).reduce((sum, entry) => sum + entry.amountFen, 0);
    const grossFen = facts.reduce((sum, order) => sum + order.amountFen, 0);
    const refundFen = facts.reduce((sum, order) => sum + order.refundFen, 0);
    return { channelId: channel.id, name: channel.name, costFen, grossFen, refundFen, netTicketFen: grossFen - refundFen,
      paidUsers: users.size, newPaidUsers: newUsers, unknownPaidAtCount,
      freeOrders: facts.filter(order => order.amountFen === 0).length,
      fullyRefundedOrders: facts.filter(order => order.amountFen > 0 && order.refundFen >= order.amountFen).length,
      costPerPaidUserFen: users.size ? Math.round(costFen / users.size) : null,
      costPerNewPaidUserFen: newUsers && !unknownPaidAtCount ? Math.round(costFen / newUsers) : null };
  });
}
