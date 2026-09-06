import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('apps/api/package.json'));
const state = JSON.parse(fs.readFileSync('.local-logs/operations-20260905/runtime.json', 'utf8'));
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '13316', DB_USERNAME: 'root', DB_PASSWORD: state.dbPassword, DB_DATABASE: 'activity_operations' });
const ds = require(path.resolve('apps/api/dist/data-source.js')).default;
await ds.initialize();
const now = Date.now(); const date = hours => new Date(now + hours * 3600000);
async function raw(route, token, method = 'GET', data) {
  const r = await fetch('http://127.0.0.1:3010/api' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  return { status: r.status, json: await r.json() };
}
async function login(username) { const r = await raw('/admin/auth/login', null, 'POST', { username, password: state.adminPassword }); assert.equal(r.status, 201); return r.json.data.token; }
try {
  const token = await login(state.adminUsername);
  const tenant = await ds.getRepository('Tenant').findOneByOrFail({ code: 'qiwai-showcase' });
  const other = await ds.getRepository('Tenant').findOneByOrFail({ code: 'operations-other-local' });
  const userRepo = ds.getRepository('User');
  const users = [];
  for (let i = 0; i < 6; i++) users.push(await userRepo.save(userRepo.create({ nickname: `本地渠道验收${i}-${now}`, sourceChannel: 'h5' })));
  const activityRepo = ds.getRepository('Activity');
  const createActivity = async (label, scope, isTest = false, past = false) => activityRepo.save(activityRepo.create({ tenant: scope, title: `本地验收：${label}-${now}`, isTest, description: '仅限隔离本地库的统计验收样本，非真实活动。', location: '本地验收', startTime: date(past ? -48 : 168), endTime: date(past ? -24 : 170), registrationDeadline: date(past ? -72 : 160), capacity: 20, price: '100.00', status: past ? 'ended' : 'draft', featured: false, requireReview: false, allowCancel: true }));
  const activity = await createActivity('渠道计算', tenant);
  const prior = await createActivity('历史付费', tenant);
  const test = await createActivity('测试口径', tenant, true);
  const otherActivity = await createActivity('其他商家', other);
  const source = await createActivity('活动后跟进', tenant, false, true);
  const channelRepo = ds.getRepository('ActivityChannel');
  const channel = await channelRepo.save(channelRepo.create({ activity, tenant, name: '本地合作渠道', code: randomUUID(), enabled: true }));
  const foreign = await channelRepo.save(channelRepo.create({ activity: otherActivity, tenant: other, name: '其他商家渠道', code: randomUUID(), enabled: true }));
  const registrationRepo = ds.getRepository('Registration');
  const orderRepo = ds.getRepository('Order');
  async function purchase(a, user, amount, paidAt, refund = 0, status = 'approved', c = null) {
    const registration = await registrationRepo.save(registrationRepo.create({ activity: a, tenant: a.tenant, user, channel: c, status, checkInCode: randomUUID(), answers: [], formSchemaVersion: 1, createdAt: date(-3) }));
    const order = await orderRepo.save(orderRepo.create({ registration, tenant: a.tenant, orderNo: `LOCAL-${randomUUID()}`, amount: amount.toFixed(2), originalAmount: amount.toFixed(2), paymentMethod: amount ? 'offline' : 'free', status: refund === amount && amount > 0 ? 'refunded' : refund ? 'partially_refunded' : 'paid', paidAt }));
    if (refund) { const repo = ds.getRepository('Refund'); await repo.save(repo.create({ order, tenant: a.tenant, refundNo: `LOCAL-${randomUUID()}`, amount: refund.toFixed(2), status: 'completed', completedAt: date(-0.5) })); }
    return { order, registration };
  }
  await purchase(prior, users[1], 50, date(-72));
  await purchase(test, users[0], 50, date(-240));
  await purchase(otherActivity, users[0], 50, date(-240));
  await purchase(activity, users[0], 100, date(-2), 0, 'approved', channel);
  await purchase(activity, users[1], 100, date(-1), 25, 'approved', channel);
  await purchase(activity, users[2], 100, date(-1), 100, 'approved', channel);
  await purchase(activity, users[3], 0, date(-1), 0, 'approved', channel);
  await purchase(activity, users[4], 100, null, 0, 'approved', channel);
  await purchase(activity, users[5], 100, date(-1), 0, 'cancelled', channel);
  const testUser = await userRepo.save(userRepo.create({ nickname: `本地明确测试账号-${now}`, sourceChannel: 'test' }));
  await purchase(activity, testUser, 100, date(-1), 0, 'approved', channel);
  const operation = (await raw(`/admin/activities/${activity.id}/operation`, token)).json.data;
  const plan = { ...operation.plan, entries: [{ label: '本地验收渠道成本', kind: 'cost', amountFen: 6000, channelId: channel.id }] };
  const saved = await raw(`/admin/activities/${activity.id}/operation`, token, 'PUT', { revision: operation.revision, plan });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
  assert.equal(saved.json.data.channelMetrics.excludedTestOrders, 1);
  const metrics = saved.json.data.channelMetrics.rows.find(row => row.channelId === channel.id);
  assert.deepEqual([metrics.paidUsers, metrics.newPaidUsers, metrics.freeOrders, metrics.fullyRefundedOrders, metrics.unknownPaidAtCount], [3, 1, 1, 1, 1]);
  assert.equal(metrics.netTicketFen, 37500); assert.equal(metrics.costPerPaidUserFen, 2000); assert.equal(metrics.costPerNewPaidUserFen, null);
  const invalid = await raw(`/admin/activities/${activity.id}/operation`, token, 'PUT', { revision: saved.json.data.revision, plan: { ...plan, entries: [{ ...plan.entries[0], channelId: foreign.id }] } });
  assert.equal(invalid.status, 400);
  const adminRepo = ds.getRepository('AdminUser');
  const limited = await adminRepo.save(adminRepo.create({ username: `channel_scope_${now}`, passwordHash: await require('bcryptjs').hash(state.adminPassword, 10), role: 'finance', tenant, enabled: true, permissions: ['finance.view'], dataScope: { type: 'activity_ids', activityIds: [activity.id] } }));
  const scoped = await raw(`/admin/activities/${activity.id}/operation`, await login(limited.username));
  assert.equal(scoped.status, 200); assert(scoped.json.data.channelMetrics.rows.every(row => row.newPaidUsers === null));
  const testOperation = await raw(`/admin/activities/${test.id}/operation`, token); assert.equal(testOperation.json.data.channelMetrics.scope, 'test');
  const sourceRegistration = await registrationRepo.save(registrationRepo.create({ activity: source, tenant, user: users[0], status: 'checked_in', checkInCode: randomUUID(), answers: [], formSchemaVersion: 1 }));
  const actor = await adminRepo.findOneByOrFail({ username: state.adminUsername });
  const follow = await raw(`/admin/activities/${source.id}/followups`, token, 'PUT', { registrationId: sourceRegistration.id, assigneeId: actor.id, kind: 'feedback', status: 'done', outcome: '本地统计联动验收，无真实触达', dueAt: date(24).toISOString(), revision: 0 });
  assert.equal(follow.status, 200);
  const followups = await raw(`/admin/activities/${source.id}/followups`, token);
  assert.deepEqual(followups.json.data.items[0].subsequent, { registrations: 1, paidActivities: 1 });
  console.log(JSON.stringify({ passed: ['退款/免费/取消分别核算', '按商家与真实首次有效付费计算新客', '付款时间缺失不输出获客成本', '测试历史与其他商家不混入新客判断', '渠道越权被拒绝', '受限活动范围不暴露商家级历史', '跟进30天后续结果联动'], activityId: activity.id, channelId: channel.id, sourceActivityId: source.id, metrics }, null, 2));
} finally { await ds.destroy(); }
