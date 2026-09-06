import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const layout = readFileSync(resolve(__dirname, '../../../../../apps/admin/src/views/Layout.vue'), 'utf8');
const accounts = readFileSync(resolve(__dirname, '../../../../../apps/admin/src/views/Admins.vue'), 'utf8');
const activities = readFileSync(resolve(__dirname, '../../../../../apps/admin/src/views/Activities.vue'), 'utf8');

describe('explicit tenant navigation', () => {
  it('prefers a validated route tenant over a cached platform selection', () => {
    expect(layout).toContain('function syncSelectedTenantToRoute(preferRoute = true)');
    expect(layout).toContain('if (preferRoute && route.query.tenantId !== undefined)');
    expect(layout).toContain('Number.isSafeInteger(requestedTenantId)');
    expect(layout).toContain('selectedPlatformTenantId.value = requestedTenantId');
  });
  it('tracks query changes and lets deliberate selector changes replace the route', () => {
    expect(layout).toContain('() => [route.path, route.query.tenantId]');
    expect(layout).toContain('syncSelectedTenantToRoute(false)');
  });
  it('keeps the selected merchant after creating an account', () => {
    expect(accounts).toContain('tenantId: form.tenantId, permissions: defaultPermissionsForRole(defaultCreateRole.value, Boolean(form.tenantId) || !platformScoped.value)');
  });
  it('namespaces unsaved new activity drafts by the logged-in tenant', () => {
    expect(activities).toContain('form.tenantId || form.tenant?.id || filters.tenantId || currentTenantId() || 0');
  });
  it('does not prefill unfinished optional sections that block new drafts', () => {
    expect(activities).toContain('sections: [] as Array<');
    expect(activities).toContain('sections: template.sections.map');
  });
});
