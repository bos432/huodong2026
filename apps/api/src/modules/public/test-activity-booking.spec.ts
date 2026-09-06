import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { testActivityBookingMessage } from '../../shared/activity-test-policy';
describe('production test activity booking', () => {
  it('blocks test activity booking only in production', () => {
    expect(testActivityBookingMessage(true, 'production')).toContain('测试活动');
    expect(testActivityBookingMessage(false, 'production')).toBeNull();
    expect(testActivityBookingMessage(true, 'development')).toBeNull();
  });
  it('checks the test policy in quote and register before calculation or registration writes', () => {
    const source = readFileSync(join(__dirname, 'public.service.ts'), 'utf8');
    const quote = source.slice(source.indexOf('async quote('), source.indexOf('async register('));
    const register = source.slice(source.indexOf('async register('), source.indexOf('await this.validateAnswers', source.indexOf('async register(')));
    expect(quote).toContain('if (testBlock) throw new BadRequestException(testBlock)');
    expect(register).toContain('if (testBlock) throw new BadRequestException(testBlock)');
  });
});
