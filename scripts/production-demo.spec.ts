import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assertDemoTarget, assertOwnedDemoTenant, demoActivity, demoMarker, demoTenantCode } from './seed-production-demo.mjs';
import { ActivityStatus, FieldType } from '../apps/api/src/shared/domain';

describe('production demo safeguards', () => {
  it('requires exact database identity and explicit confirmation', () => {
    const target = { database: 'reader', host: '127.0.0.1', port: 3306 };
    expect(() => assertDemoTarget(target, 'rd.chaimen666.com/reader/manpi-demo')).not.toThrow();
    for (const targetOverride of [{ database: 'other' }, { host: 'remote' }, { port: 3307 }]) {
      expect(() => assertDemoTarget({ ...target, ...targetOverride }, 'rd.chaimen666.com/reader/manpi-demo')).toThrow();
    }
    expect(() => assertDemoTarget(target, undefined)).toThrow();
  });
  it('refuses a preexisting unmarked or differently owned merchant', () => {
    expect(() => assertOwnedDemoTenant(null)).not.toThrow();
    expect(() => assertOwnedDemoTenant({ code: demoTenantCode, settings: { demoContentMarker: demoMarker } })).not.toThrow();
    expect(() => assertOwnedDemoTenant({ code: demoTenantCode, settings: {} })).toThrow();
    expect(() => assertOwnedDemoTenant({ code: 'real-merchant', settings: { demoContentMarker: demoMarker } })).toThrow();
  });
  it('creates disclosed test-only activities with Beijing-time dates', () => {
    const items = JSON.parse(readFileSync('apps/admin/src/data/local-demo-activities.json', 'utf8'));
    const templates = JSON.parse(readFileSync('apps/admin/src/data/activity-starter-pack.json', 'utf8'));
    for (const item of items) {
      const activity = demoActivity(item, templates.find(template => template.id === item.id), new Date('2026-09-12T00:00:00Z'));
      expect(activity.isTest).toBe(true);
      expect(activity.status).toBe(ActivityStatus.Open);
      expect(Object.values(ActivityStatus)).toContain(activity.status);
      for (const field of activity.fields) expect(Object.values(FieldType)).toContain(field.type);
      expect(activity.description).toContain('不开放报名或付款');
      expect(activity.location).toContain('虚拟');
      expect(+activity.endTime).toBeGreaterThan(+activity.startTime);
      expect(+activity.registrationDeadline).toBeLessThan(+activity.startTime);
    }
    expect(demoActivity(items[0], templates[0], new Date('2026-09-12T00:00:00Z')).startTime.toISOString()).toBe('2026-09-12T06:00:00.000Z');
  });
});
