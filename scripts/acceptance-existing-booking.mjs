import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(path.resolve('apps/api/package.json'));
const state = JSON.parse(fs.readFileSync('.local-logs/operations-20260905/runtime.json', 'utf8'));
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '13316', DB_USERNAME: 'root', DB_PASSWORD: state.dbPassword, DB_DATABASE: 'activity_operations' });
const ds = require(path.resolve('apps/api/dist/data-source.js')).default; await ds.initialize();
async function call(route, token, method = 'GET', data) {
  const r = await fetch('http://127.0.0.1:3010/api' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  return { status: r.status, cache: r.headers.get('cache-control'), data: (await r.json()).data };
}
try {
  const tenant = await ds.getRepository('Tenant').findOneByOrFail({ code: 'qiwai-showcase' });
  const [a, b] = state.socialTestAccounts;
  const loginA = await call('/public/auth/password-login', null, 'POST', { phone: a.phone, password: state.adminPassword });
  const loginB = await call('/public/auth/password-login', null, 'POST', { phone: b.phone, password: state.adminPassword });
  assert.equal(loginA.status, 201); assert.equal(loginB.status, 201);
  const actRepo = ds.getRepository('Activity');
  const activity = await actRepo.save(actRepo.create({ tenant, title: `本地报名状态验收-${Date.now()}`, description: '本地隔离验证活动，不代表真实举办安排。', isTest: true, location: '本地测试地点', startTime: new Date(Date.now() + 86400000), endTime: new Date(Date.now() + 90000000), registrationDeadline: new Date(Date.now() + 3600000), price: '100.00', capacity: 2, status: 'open', featured: false, requireReview: true, allowCancel: true }));
  const regRepo = ds.getRepository('Registration'); const registration = await regRepo.save(regRepo.create({ activity, tenant, user: { id: a.id }, answers: [], status: 'pending_payment', checkInCode: randomUUID() }));
  const orderRepo = ds.getRepository('Order'); const order = await orderRepo.save(orderRepo.create({ registration, tenant, orderNo: `BOOK-${randomUUID()}`, amount: '100.00', originalAmount: '100.00', paymentMethod: 'offline', status: 'pending_payment' }));
  const waitRepo = ds.getRepository('Waitlist'); const waitlist = await waitRepo.save(waitRepo.create({ activity, user: { id: b.id }, answers: [], status: 'waiting' }));
  const url = `/public/activities/${activity.id}/enhanced?tenantCode=qiwai-showcase`;
  for (const status of ['pending_payment', 'pending_review', 'approved', 'checked_in']) {
    await regRepo.update(registration.id, { status });
    await orderRepo.update(order.id, { status: status === 'pending_payment' ? 'pending_payment' : 'paid', paidAt: status === 'pending_payment' ? null : new Date() });
    const response = await call(url, loginA.data.userAccessToken); assert.equal(response.status, 200);
    assert.deepEqual(response.data.myBooking.registration, { id: registration.id, status }); assert.match(response.cache, /no-store/);
    assert.equal(response.data.myBooking.waitlist, null);
  }
  const theirs = await call(url, loginB.data.userAccessToken); assert.equal(theirs.data.myBooking.registration, null); assert.equal(theirs.data.myBooking.waitlist.id, waitlist.id);
  const guest = await call(url, null); assert.deepEqual(guest.data.myBooking, { registration: null, waitlist: null });
  await regRepo.update(registration.id, { status: 'cancelled' });
  await orderRepo.update(order.id, { status: 'refunded' });
  const refundRepo = ds.getRepository('Refund'); await refundRepo.save(refundRepo.create({ order, tenant, refundNo: `BOOK-${randomUUID()}`, amount: '100.00', status: 'completed', completedAt: new Date() }));
  assert.equal((await call(url, loginA.data.userAccessToken)).data.myBooking.registration, null);
  const wrongTenant = await call(`/public/activities/${activity.id}/enhanced?tenantCode=operations-other-local`, loginA.data.userAccessToken); assert.equal(wrongTenant.status, 404);
  console.log(JSON.stringify({ passed: ['待付款/审核/已报名/签到状态正确', '候补只对本人返回', '游客无个人报名信息', '跨商家拒绝', '已取消不误作有效报名', '个性化详情禁止缓存'], activityId: activity.id, registrationId: registration.id, waitlistId: waitlist.id }, null, 2));
} finally { await ds.destroy(); }
