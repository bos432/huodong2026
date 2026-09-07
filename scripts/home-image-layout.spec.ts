import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assertDemoHomeOwnership, demoHomeSections, homeMarker } from './curate-demo-home.mjs';

const home = readFileSync('apps/mobile/src/pages/index/index.vue', 'utf8');
const row = readFileSync('apps/mobile/src/components/ActivityPreviewRow.vue', 'utf8');

describe('approved homepage image layout', () => {
  it('keeps the lead image unobscured and text in document flow', () => {
    expect(home).toContain('mode="aspectFit"');
    expect(home).toContain('aspect-ratio: 3 / 2');
    expect(home).not.toContain('feature-shade');
    expect(home).not.toContain('feature-side-rail');
    expect(home).toContain('class="feature-lead-copy"');
    expect(home).toContain('@error="leadImageFailed = true"');
  });
  it('uses one accessible row for all secondary activities', () => {
    expect(home.match(/<ActivityPreviewRow /g)).toHaveLength(3);
    expect(row).toContain('@keyup.space.prevent="emit(\'open\')"');
    expect(row).toContain('@error="imageFailed = true"');
    expect(row).toContain('activity.isTest');
    expect(home).toContain('const featuredIds = new Set(heroActivities.value.map');
  });
  it('rejects non-demo merchants, activities and custom homepages', () => {
    const tenant = { id: 5, code: 'manpi-demo', settings: { demoContentMarker: 'production-demo-20260906-v1', demoActivityIds: { a: 25, b: 26, c: 27, d: 28, e: 29, f: 30 } } };
    const activities = [25, 26, 27, 28, 29, 30].map(id => ({ id, isTest: true, tenant: { id: 5 } }));
    expect(() => assertDemoHomeOwnership(tenant, activities, [])).not.toThrow();
    expect(() => assertDemoHomeOwnership({ ...tenant, code: 'real-merchant' }, activities, [])).toThrow();
    expect(() => assertDemoHomeOwnership(tenant, [{ ...activities[0], isTest: false }, ...activities.slice(1)], [])).toThrow();
    expect(() => assertDemoHomeOwnership(tenant, activities, [{ config: {} }])).toThrow();
    expect(() => assertDemoHomeOwnership(tenant, activities, [{ config: { demoHomeMarker: homeMarker } }])).not.toThrow();
    expect(demoHomeSections[0].config.limit).toBe(1);
  });
});
