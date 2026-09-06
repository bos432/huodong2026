import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const demos = JSON.parse(readFileSync(resolve('apps/admin/src/data/local-demo-activities.json'), 'utf8'));
const templates = JSON.parse(readFileSync(resolve('apps/admin/src/data/activity-starter-pack.json'), 'utf8'));
const script = readFileSync(resolve('scripts/seed-local-demo-content.mjs'), 'utf8');

describe('local demonstration activities', () => {
  it('provides six distinct, labeled activities across four categories', () => {
    expect(demos).toHaveLength(6);
    expect(new Set(demos.map((item: any) => item.id)).size).toBe(6);
    expect(new Set(demos.map((item: any) => item.category)).size).toBe(4);
    for (const item of demos) {
      expect(item.title).toMatch(/^【演示】/);
      expect(item.location).toContain('虚拟');
      expect(templates.some((template: any) => template.id === item.id)).toBe(true);
      expect(Number.isFinite(item.price) && item.price >= 0).toBe(true);
    }
  });
  it('uses recorded image sources and schedules valid local times', () => {
    for (const item of demos) {
      expect(new URL(item.image).hostname).toBe('images.unsplash.com');
      expect(item.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(item.dayOffset).toBeGreaterThanOrEqual(0);
    }
  });
  it('requires explicit application and a local development tenant', () => {
    expect(script).toContain("const base = 'http://127.0.0.1:3010/api'");
    expect(script).toContain("process.argv.includes('--apply')");
    expect(script).toContain("config.environment !== 'development'");
    expect(script).toContain('isTest: true');
    expect(script).toContain('registrationsCreated: 0, reviewsCreated: 0');
  });
});
