import { describe, it, expect } from 'vitest';
import { existingActivityBooking } from '../apps/mobile/src/activity-booking-action';
describe('existing activity booking action', () => {
  it('keeps paid, approved and checked-in records on their original registration', () => {
    for (const status of ['pending_payment', 'pending_review', 'approved', 'checked_in']) expect(existingActivityBooking({ myBooking: { registration: { id: 5, status } } })?.registrationId).toBe(5);
  });
  it('does not offer repeat waitlisting or treat cancelled records as active bookings', () => {
    expect(existingActivityBooking({ myBooking: { waitlist: { id: 4, status: 'waiting' } } })?.waiting).toBe(true);
    expect(existingActivityBooking({ myBooking: { registration: { id: 5, status: 'cancelled' } } })).toBeNull();
    expect(existingActivityBooking(null)).toBeNull();
  });
});
