import { describe, expect, it, vi } from 'vitest';
import { PublicService } from './public.service';

vi.mock('typeorm', async () => ({
  ...await vi.importActual<typeof import('typeorm')>('typeorm'),
  Column: () => () => undefined
}));

describe('activity quote refund disclosure', () => {
  function setup(payableAmount: string) {
    const tenant = { id: 7 };
    const quote = { originalAmount: '20.00', payableAmount };
    const policy = { enabled: true, charityAmount: '1.00', refundAmount: '19.00' };
    const service = Object.create(PublicService.prototype) as any;
    service.findPublicActivity = vi.fn().mockResolvedValue({ id: 40, tenant, isTest: false });
    service.config = { get: () => 'development' };
    service.assertPublicTenantAccess = vi.fn();
    service.calculateQuote = vi.fn().mockResolvedValue(quote);
    service.orders = { create: vi.fn(input => input) };
    service.charityFund = { previewRetainedActivityRefund: vi.fn().mockResolvedValue(policy) };
    return { service, tenant, policy };
  }

  it('previews the same tenant policy before an order is created', async () => {
    const { service, tenant, policy } = setup('20.00');
    const result = await service.quote(40, {}, { id: 45 }, { tenantCode: 'local-test' });
    expect(result.payableAmount).toBe('20.00');
    expect(result.refundPolicy).toEqual(policy);
    expect(service.charityFund.previewRetainedActivityRefund).toHaveBeenCalledWith({ tenant, amount: '20.00', originalAmount: '20.00' });
  });

  it('does not attach paid refund terms to free quotes', async () => {
    const { service } = setup('0.00');
    expect((await service.quote(40, {}, { id: 45 })).refundPolicy).toBeNull();
    expect(service.charityFund.previewRetainedActivityRefund).not.toHaveBeenCalled();
  });
  it('matches the refund write guard for checked-in registrations', async () => {
    const { service } = setup('20.00');
    const checkedIn = await service.registrationCharityRefundView({ amount: '20.00', status: 'paid', registration: { status: 'checked_in' } }, []);
    expect(checkedIn.canRequest).toBe(false);
    expect(checkedIn.requestDisabledReason).toContain('已签到');
    const approved = await service.registrationCharityRefundView({ amount: '20.00', status: 'paid', registration: { status: 'approved' } }, []);
    expect(approved.canRequest).toBe(true);
  });
});
