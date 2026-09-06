import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isLegacySeedHost } from './activity-host-evidence';
describe('host evidence', () => {
  const seeded = { name: '林知夏', title: '活动主理人', avatarUrl: null, bio: '长期策划读书会和创作者线下活动，关注知识分享与社群连接。' };
  it('only hides the exact automatically seeded profile', () => {
    expect(isLegacySeedHost(seeded)).toBe(true);
    expect(isLegacySeedHost({ ...seeded, bio: '主办方填写的实际履历' })).toBe(false);
    expect(isLegacySeedHost({ ...seeded, name: '另一位主理人' })).toBe(false);
  });
  it('does not manufacture host or agenda data on startup', () => {
    const source = readFileSync(join(__dirname, '../modules/v1/v1.service.ts'), 'utf8');
    const seed = source.slice(source.indexOf('private async ensureV1Seeds()'));
    expect(seed).not.toContain('this.hosts.save');
    expect(seed).not.toContain('this.sections.save');
  });
});
