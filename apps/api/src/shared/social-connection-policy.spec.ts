import { describe, it, expect } from 'vitest';
import { CONNECTION_EXPIRY_MS, CONNECTION_COOLDOWN_MS, connectionActions, connectionRequestState, ConnectionState } from './social-connection-policy';
const now = new Date('2026-09-06T00:00:00Z');
const base: ConnectionState = { lowUserId: 1, highUserId: 2, requesterId: 1, status: 'pending', lowBlocked: false, highBlocked: false, requestedAt: new Date(+now - 1000) };
describe('social connection consent', () => {
  it('requires recipient consent, not reverse-direction requests', () => {
    expect(connectionActions(base, 1, now)).toEqual(['withdraw', 'block']);
    expect(connectionActions(base, 2, now)).toEqual(['accept', 'decline', 'block']);
    expect(connectionActions(base, 3, now)).toEqual([]);
    expect(connectionRequestState(base, now)).toBe('existing');
  });
  it('does not allow acceptance of expired requests', () => {
    const row = { ...base, requestedAt: new Date(+now - CONNECTION_EXPIRY_MS) };
    expect(connectionActions(row, 2, now)).toEqual(['block']);
    expect(connectionRequestState(row, now)).toBe('allowed');
  });
  it('keeps each party blocking independently', () => {
    const row = { ...base, status: 'disconnected', lowBlocked: true, highBlocked: true };
    expect(connectionActions(row, 1, now)).toEqual(['unblock']);
    expect(connectionRequestState({ ...row, lowBlocked: false }, now)).toBe('blocked');
    expect(connectionActions({ ...row, lowBlocked: false }, 1, now)).toEqual(['block']);
  });
  it('enforces cooldown after decline, withdrawal or disconnect', () => {
    for (const status of ['declined', 'withdrawn', 'disconnected']) {
      expect(connectionRequestState({ ...base, status, closedAt: new Date(+now - 1000) }, now)).toBe('cooldown');
      expect(connectionRequestState({ ...base, status, closedAt: new Date(+now - CONNECTION_COOLDOWN_MS) }, now)).toBe('allowed');
    }
  });
});
