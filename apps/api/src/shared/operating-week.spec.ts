import { describe, it, expect } from 'vitest';
import { operatingWeek } from './operating-week';
describe('Shanghai operating week', () => {
  const now = new Date('2026-09-05T08:00:00Z');
  it('defaults to the last complete Monday-to-Monday week in Shanghai', () => {
    const result = operatingWeek(undefined, now);
    expect(result.date).toBe('2026-08-24'); expect(result.start.toISOString()).toBe('2026-08-23T16:00:00.000Z');
    expect(result.end.toISOString()).toBe('2026-08-30T16:00:00.000Z'); expect(result.complete).toBe(true);
  });
  it('labels the current week incomplete and rejects non-Mondays, invalid and future dates', () => {
    expect(operatingWeek('2026-08-31', now).complete).toBe(false);
    for (const value of ['2026-09-05', '2026-09-07', '2026-02-30', 'bad']) expect(() => operatingWeek(value, now)).toThrow();
  });
});
