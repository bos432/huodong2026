import { describe, expect, it, vi } from 'vitest';
import { AdminService } from './admin.service';

vi.mock('typeorm', async () => ({
  ...await vi.importActual<typeof import('typeorm')>('typeorm'),
  Column: () => () => undefined
}));

describe('refreshed admin tenant permissions', () => {
  it('retains normalized merchant permissions without exposing raw settings', async () => {
    const service = Object.create(AdminService.prototype) as any;
    service.admins = { findOne: vi.fn().mockResolvedValue({
      id: 29, username: 'local_admin', role: 'super_admin', enabled: true,
      tenant: { id: 6, code: 'local-review', name: 'Local test', enabled: true,
        settings: { registrationReviewEnabled: true, mallEnabled: false, privateApiKey: 'must-not-leak' } }
    }) };
    const profile = await service.currentAdmin({ id: 29 });
    expect(profile.tenantId).toBe(6);
    expect(profile.tenant.settings.registrationReviewEnabled).toBe(true);
    expect(profile.tenant.settings.mallEnabled).toBe(false);
    expect(JSON.stringify(profile)).not.toContain('must-not-leak');
  });
});
