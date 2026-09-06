export type ConnectionState = { lowUserId: number; highUserId: number; requesterId: number; status: string; lowBlocked: boolean; highBlocked: boolean; requestedAt: Date; closedAt?: Date | null };
export const CONNECTION_EXPIRY_MS = 14 * 86400000;
export const CONNECTION_COOLDOWN_MS = 7 * 86400000;
export function connectionActions(row: ConnectionState, userId: number, now = new Date()) {
  if (userId !== row.lowUserId && userId !== row.highUserId) return [];
  const ownBlocked = userId === row.lowUserId ? row.lowBlocked : row.highBlocked;
  const otherBlocked = userId === row.lowUserId ? row.highBlocked : row.lowBlocked;
  if (ownBlocked) return ['unblock'];
  if (otherBlocked) return ['block'];
  if (row.status === 'accepted') return ['disconnect', 'block'];
  if (row.status === 'pending' && +now - +row.requestedAt < CONNECTION_EXPIRY_MS) return row.requesterId === userId ? ['withdraw', 'block'] : ['accept', 'decline', 'block'];
  return ['block'];
}
export function connectionRequestState(row: ConnectionState | null, now = new Date()) {
  if (!row) return 'allowed';
  if (row.lowBlocked || row.highBlocked) return 'blocked';
  if (row.status === 'accepted' || row.status === 'pending' && +now - +row.requestedAt < CONNECTION_EXPIRY_MS) return 'existing';
  if (+now - +(row.closedAt || row.requestedAt) < CONNECTION_COOLDOWN_MS) return 'cooldown';
  return 'allowed';
}
