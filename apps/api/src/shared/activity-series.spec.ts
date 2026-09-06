import { describe, expect, it } from 'vitest';
import { validateSeriesBatch } from './activity-series';

const session = { startTime: '2099-01-02T06:00:00Z', endTime: '2099-01-02T08:00:00Z', registrationDeadline: '2099-01-01T06:00:00Z', location: '本地验收场地' };
describe('activity series planning', () => {
  it('accepts timezone-aware sessions and normalizes whitespace', () => {
    expect(validateSeriesBatch({ title: '  周末共读 ', revision: 0, sessions: [session] }).title).toBe('周末共读');
  });
  it('rejects overlaps, invalid times and stale-shaped revisions', () => {
    expect(() => validateSeriesBatch({ title: '系列', revision: 0, sessions: [session, session] })).toThrow('重叠');
    expect(() => validateSeriesBatch({ title: '系列', revision: 0, sessions: [{ ...session, startTime: '2099-01-02 06:00:00' }] })).toThrow('时区');
    expect(() => validateSeriesBatch({ title: '系列', revision: -1, sessions: [session] })).toThrow('版本');
    expect(() => validateSeriesBatch({ title: '系列', revision: 0, sessions: [{ ...session, registrationDeadline: session.startTime }] })).toThrow('截止时间');
  });
  it('requires a bounded batch and a real location value', () => {
    expect(() => validateSeriesBatch({ title: '系列', revision: 0, sessions: [] })).toThrow();
    expect(() => validateSeriesBatch({ title: '系列', revision: 0, sessions: Array(13).fill(session) })).toThrow();
    expect(() => validateSeriesBatch({ title: '系列', revision: 0, sessions: [{ ...session, location: '' }] })).toThrow();
  });
});
