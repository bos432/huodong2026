import { describe, expect, it } from 'vitest';
import { formatShanghaiDateTime, shanghaiDateTimeToIso } from '../apps/admin/src/date-time';

describe('admin Beijing time', () => {
  it('converts API timestamps while preserving civil Beijing inputs', () => {
    expect(formatShanghaiDateTime('2026-09-13T00:32:10.000Z')).toBe('2026-09-13 08:32');
    expect(formatShanghaiDateTime('2026-09-13 08:32:10', '', true)).toBe('2026-09-13 08:32:10');
    expect(formatShanghaiDateTime('2026-09-13T08:32:10+08:00')).toBe('2026-09-13 08:32');
  });
  it('does not shift the timestamp when an activity is edited and saved again', () => {
    const original = '2026-09-13T00:32:10.000Z';
    expect(shanghaiDateTimeToIso(formatShanghaiDateTime(original, '', true))).toBe(original);
    expect(formatShanghaiDateTime('2026-09-12T16:00:00Z')).toBe('2026-09-13 00:00');
  });
  it('rejects invalid form dates and gives display fallbacks', () => {
    expect(() => shanghaiDateTimeToIso('2026-02-30 12:00:00')).toThrow('有效的北京时间');
    expect(() => shanghaiDateTimeToIso('')).toThrow('有效的北京时间');
    expect(formatShanghaiDateTime(undefined)).toBe('-');
    expect(formatShanghaiDateTime('unknown')).toBe('-');
  });
});
