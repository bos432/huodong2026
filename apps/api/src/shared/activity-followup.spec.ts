import { describe, it, expect } from 'vitest';
import { normalizeActivityFollowup } from './activity-followup';
const input = { registrationId: 1, assigneeId: 1, revision: 0, kind: 'feedback', status: 'pending', dueAt: '2099-01-01T10:00:00+08:00', outcome: '' };
describe('activity followup input', () => {
  it('normalizes safe fields and drops injected scope identifiers', () => {
    const result = normalizeActivityFollowup({ ...input, activityId: 999, tenantId: 999 });
    expect(result.dueAt.toISOString()).toBe('2099-01-01T02:00:00.000Z');
    expect(result).not.toHaveProperty('activityId');
  });
  it('requires valid owners, status and evidence for terminal outcomes', () => {
    for (const patch of [{ assigneeId: -1 }, { registrationId: '1' }, { revision: 0.5 }, { status: 'sent' }, { kind: 'sms' }, { status: 'done' }, { status: 'declined' }, { dueAt: 'invalid' }]) expect(() => normalizeActivityFollowup({ ...input, ...patch })).toThrow();
  });
});
