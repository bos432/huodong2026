import assert from 'node:assert/strict';

export async function acceptManpiActivityFlow({ ds, http, tenant, other, user, token, tokenB, reviewerToken, passwordHash, password, runNamespace }) {
  assert(ds.options.host === '127.0.0.1' && Number(ds.options.port) === 13318, 'Activity fixtures require the owned isolated database');
  const check = (result, status) => { assert.equal(result.status, status, result.message); return result.data; };
  check(await http(`/admin/tenants/${tenant.id}/permissions`, reviewerToken, 'POST', { activityPublishReviewRequired: true, registrationReviewEnabled: true }), 201);
  const admins = ds.getRepository('AdminUser');
  const host = await admins.save(admins.create({ username: `local_flow_host_${runNamespace}`, passwordHash, role: 'operator', enabled: true, tenant, dataScope: { type: 'all' }, permissions: ['activity.view', 'activity.manage', 'registration.view', 'registration.manage', 'checkin.manage', 'review.view', 'review.manage'] }));
  const foreignHost = await admins.save(admins.create({ username: `local_flow_foreign_${runNamespace}`, passwordHash, role: 'operator', enabled: true, tenant: other, dataScope: { type: 'all' }, permissions: ['activity.view', 'activity.manage', 'registration.view', 'checkin.manage'] }));
  const hostToken = check(await http('/admin/auth/login', null, 'POST', { username: host.username, password }), 201).token;
  const foreignToken = check(await http('/admin/auth/login', null, 'POST', { username: foreignHost.username, password }), 201).token;
  const now = Date.now();
  const activityDraft = {
    title: `Local-only activity lifecycle ${runNamespace}`, description: 'Isolated API acceptance activity, not a public event or a real booking offer.',
    notice: 'Local fixture only. No external payment or notification is sent.', location: 'Isolated test venue',
    startTime: new Date(now + 86400000).toISOString(), endTime: new Date(now + 90000000).toISOString(), registrationDeadline: new Date(now + 3600000).toISOString(),
    capacity: 1, price: 0, status: 'draft', isTest: false, featured: false, requireReview: true, allowCancel: true,
    fields: [{ label: 'Contact phone', type: 'phone', required: true, sortOrder: 1, options: [] }],
    hosts: [{ name: 'Local fixture organizer', title: 'Isolated acceptance only', sortOrder: 1 }],
    eligibilityRules: { requirePrivacyConsent: true, maxRegistrationsPerUser: 1 }
  };
  const activity = check(await http('/admin/activities', hostToken, 'POST', activityDraft), 201);
  assert.equal(activity.status, 'draft');
  assert.equal((await http(`/public/activities/${activity.id}`, token)).status, 404, 'Draft must not be public');
  assert([403, 404].includes((await http(`/admin/activities/${activity.id}`, foreignToken)).status), 'Other tenant must not read the draft');
  const submitted = check(await http(`/admin/activities/${activity.id}/submit-approval`, hostToken, 'POST'), 201);
  assert.equal(submitted.status, 'pending_approval');
  assert.equal((await http(`/admin/activities/${activity.id}/approve`, hostToken, 'POST', {})).status, 403, 'Host must not approve their own publication');
  assert.equal(check(await http(`/admin/activities/${activity.id}/approve`, reviewerToken, 'POST', { remark: 'Local fixture review' }), 201).status, 'open');
  assert.equal(check(await http(`/public/activities/${activity.id}`, token), 200).id, activity.id);
  assert.equal((await http(`/public/activities/${activity.id}`, token, 'GET', undefined, other.code)).status, 404);
  const registrationDraft = { answers: activity.fields.map(field => ({ fieldId: field.id, label: field.label, type: field.type, value: user.phone })), privacyAccepted: true };
  assert.equal((await http(`/public/activities/${activity.id}/register`, token, 'POST', { ...registrationDraft, privacyAccepted: false })).status, 400);
  const booked = check(await http(`/public/activities/${activity.id}/register`, token, 'POST', registrationDraft), 201);
  const registrationId = booked.registration.id;
  assert.equal(booked.registration.status, 'pending_review');
  assert.equal(Number(booked.order.amount), 0);
  assert.equal((await http(`/public/activities/${activity.id}/register`, token, 'POST', registrationDraft)).status, 400, 'Duplicate booking must not succeed');
  const waitlisted = check(await http(`/public/activities/${activity.id}/register`, tokenB, 'POST', registrationDraft), 201);
  assert.equal(waitlisted.waitlisted, true, 'Full activity must clearly return a waitlist result');
  assert.equal(waitlisted.registration, null);
  assert.equal(waitlisted.order, null, 'Waitlist must not create a paid or pending order');
  const queuedDetail = check(await http(`/public/activities/${activity.id}/enhanced`, tokenB), 200);
  assert.equal(queuedDetail.waitingCount, 1, 'Enhanced detail must reflect the persisted waiting entry');
  assert.equal(queuedDetail.myBooking.waitlist.id, waitlisted.waitlist.id);
  assert.equal(await ds.getRepository('Registration').count({ where: { activity: { id: activity.id } } }), 1, 'Reserved capacity must prevent another booking');
  assert.equal((await http(`/public/me/registrations/${registrationId}`, tokenB)).status, 404);
  assert.equal((await http(`/admin/registrations/${registrationId}/check-in`, hostToken, 'POST', {})).status, 400, 'Unapproved registration cannot be checked in');
  check(await http(`/admin/registrations/${registrationId}/approve`, hostToken, 'POST', { remark: 'Local fixture registration review' }), 201);
  const owned = check(await http(`/public/me/registrations/${registrationId}`, token), 200);
  assert.equal(owned.registration.status, 'approved');
  check(await http(`/public/me/registrations/${registrationId}/check-in-code`, token), 200);
  assert([403, 404].includes((await http(`/admin/registrations/${registrationId}/check-in`, foreignToken, 'POST', {})).status));
  const checked = check(await http(`/admin/registrations/${registrationId}/check-in`, hostToken, 'POST', { remark: 'Local fixture on-site verification' }), 201);
  assert.equal(checked.registration.status, 'checked_in');
  assert.equal((await http(`/admin/registrations/${registrationId}/check-in`, hostToken, 'POST', {})).status, 400, 'Duplicate check-in must not award participation twice');
  const reviewDraft = { rating: 5, content: 'Local acceptance review, not a real user testimonial.' };
  assert.equal((await http(`/public/registrations/${registrationId}/review`, token, 'POST', reviewDraft)).status, 400, 'Future activity must not accept a review');
  // Move only this owned fixture's clock forward; core transitions still use public/admin HTTP.
  await ds.getRepository('Activity').update(activity.id, { startTime: new Date(now - 7200000), endTime: new Date(now - 3600000), registrationDeadline: new Date(now - 86400000) });
  check(await http(`/admin/activities/${activity.id}/end`, hostToken, 'POST'), 201);
  const review = check(await http(`/public/registrations/${registrationId}/review`, token, 'POST', reviewDraft), 201);
  const storedReview = await ds.getRepository('ActivityReview').findOne({ where: { id: review.id }, relations: { registration: true, user: true } });
  assert.equal(storedReview.registration.id, registrationId);
  assert.equal(storedReview.user.id, user.id);
  assert.equal((await http(`/public/registrations/${registrationId}/review`, tokenB, 'POST', reviewDraft)).status, 400);
  assert.equal((await http(`/public/registrations/${registrationId}/review`, token, 'POST', reviewDraft, other.code)).status, 404);
  assert.equal((await http(`/public/me/activity-reviews`, token)).data.some(row => row.id === review.id), true);
  assert.equal(await ds.getRepository('CheckIn').count({ where: { registration: { id: registrationId } } }), 1);
  const cancellable = check(await http('/admin/activities', hostToken, 'POST', { ...activityDraft, title: `Local-only cancellation ${runNamespace}` }), 201);
  check(await http(`/admin/activities/${cancellable.id}/submit-approval`, hostToken, 'POST'), 201);
  check(await http(`/admin/activities/${cancellable.id}/approve`, reviewerToken, 'POST', {}), 201);
  const cancellationAnswers = { ...registrationDraft, answers: cancellable.fields.map(field => ({ fieldId: field.id, label: field.label, type: field.type, value: user.phone })) };
  const cancellableBooking = check(await http(`/public/activities/${cancellable.id}/register`, token, 'POST', cancellationAnswers), 201);
  const queued = check(await http(`/public/activities/${cancellable.id}/register`, tokenB, 'POST', cancellationAnswers), 201);
  assert.equal(queued.waitlisted, true);
  assert.equal((await http(`/admin/waitlists/${queued.waitlist.id}/promote`, reviewerToken, 'POST')).status, 400);
  assert.equal((await http(`/public/me/registrations/${cancellableBooking.registration.id}/cancel`, tokenB, 'POST')).status, 404);
  assert.equal((await http(`/public/me/registrations/${cancellableBooking.registration.id}/cancel`, token, 'POST', undefined, other.code)).status, 404);
  assert.equal(check(await http(`/public/me/registrations/${cancellableBooking.registration.id}/cancel`, token, 'POST'), 201).status, 'cancelled');
  assert.equal((await http(`/public/me/registrations/${cancellableBooking.registration.id}/cancel`, token, 'POST')).status, 400);
  assert.equal((await http(`/public/me/registrations/${cancellableBooking.registration.id}/check-in-code`, token)).status, 400);
  assert([403, 404].includes((await http(`/admin/waitlists/${queued.waitlist.id}/promote`, foreignToken, 'POST')).status));
  const promoted = check(await http(`/admin/waitlists/${queued.waitlist.id}/promote`, reviewerToken, 'POST'), 201);
  assert.equal(promoted.status, 'promoted');
  const storedQueue = await ds.getRepository('Waitlist').findOne({ where: { id: queued.waitlist.id }, relations: { promotedRegistration: true, user: true } });
  assert(storedQueue.promotedRegistration?.id);
  const promotedOwner = check(await http(`/public/me/registrations/${storedQueue.promotedRegistration.id}`, tokenB), 200);
  assert.equal(promotedOwner.registration.status, 'pending_review');
  assert.equal(Number(promotedOwner.order.amount), 0);
  assert.equal((await http(`/admin/waitlists/${queued.waitlist.id}/promote`, reviewerToken, 'POST')).status, 400);
  assert.equal(await ds.getRepository('Registration').count({ where: { activity: { id: cancellable.id }, status: 'pending_review' } }), 1);
  return ['Isolated host draft -> platform approval -> public discovery -> free registration review -> on-site verification -> completed activity -> owner review; no real payment tested', 'Publication/booking/check-in/review ownership and tenant isolation, privacy consent, reserved capacity, duplicate booking/check-in and premature review rejection', 'Owner cancellation releases capacity; isolated admin waitlist promotion preserves owner and review state; full-capacity, foreign-tenant and repeated promotion rejected'];
}
