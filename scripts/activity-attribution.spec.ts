import { describe, expect, it } from 'vitest';
import { activityH5PreviewUrl } from '../apps/admin/src/h5-preview';
import { normalizeActivityAttributionUrl } from '../apps/mobile/src/activity-attribution';

describe('activity channel links', () => {
  it('generates tracking parameters inside the H5 route', () => {
    const url = new URL(activityH5PreviewUrl(40, 'local-test', { channelCode: 'local-ui', source: 'test_source' }));
    const route = new URL(url.hash.slice(1), url.origin);
    expect(url.searchParams.get('tenantCode')).toBe('local-test');
    expect(url.searchParams.has('channelCode')).toBe(false);
    expect(route.searchParams.get('channelCode')).toBe('local-ui');
    expect(route.searchParams.get('source')).toBe('test_source');
    expect(route.searchParams.get('id')).toBe('40');
  });
  it('migrates legacy outer query parameters and removes them from later navigation', () => {
    const result = normalizeActivityAttributionUrl('http://localhost/?tenantCode=local&channelCode=old&source=legacy&inviteCode=invite#/pages/activity/detail?id=40');
    expect(result).toMatchObject({ channelCode: 'old', source: 'legacy', inviteCode: 'invite' });
    const url = new URL(result.url);
    expect(url.searchParams.has('channelCode')).toBe(false);
    expect(url.searchParams.get('tenantCode')).toBe('local');
    expect(normalizeActivityAttributionUrl(result.url)).toEqual(result);
  });
  it('preserves explicit route attribution over legacy values', () => {
    expect(normalizeActivityAttributionUrl('http://localhost/?channelCode=old#/pages/activity/register?id=40&channelCode=new').channelCode).toBe('new');
  });
  it('does not attach activity attribution to unrelated pages or invalid URLs', () => {
    expect(normalizeActivityAttributionUrl('http://localhost/?channelCode=old#/pages/user/my').channelCode).toBe('');
    expect(normalizeActivityAttributionUrl('not a url').channelCode).toBe('');
  });
});
