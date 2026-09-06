import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('apps/api/package.json'));
const state = JSON.parse(fs.readFileSync('.local-logs/operations-20260905/runtime.json', 'utf8'));
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '13316', DB_USERNAME: 'root', DB_PASSWORD: state.dbPassword, DB_DATABASE: 'activity_operations' });
const ds = require(path.resolve('apps/api/dist/data-source.js')).default; await ds.initialize();
async function raw(route, token, method = 'GET', data) {
  const response = await fetch('http://127.0.0.1:3010/api' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  return { status: response.status, json: await response.json() };
}
async function login(username) { const r = await raw('/admin/auth/login', null, 'POST', { username, password: state.adminPassword }); assert.equal(r.status, 201); return r.json.data.token; }
try {
  const token = await login(state.adminUsername);
  const tenantRepo = ds.getRepository('Tenant'); const tenant = await tenantRepo.save(tenantRepo.create({ code: `report-${Date.now()}`, name: '仅本地报表一致性验收', enabled: true, settings: {} }));
  const userRepo = ds.getRepository('User'); const buyer = await userRepo.save(userRepo.create({ nickname: '本地报表付费样本', sourceChannel: 'h5' })); const free = await userRepo.save(userRepo.create({ nickname: '本地报表免费样本', sourceChannel: 'h5' })); const tester = await userRepo.save(userRepo.create({ nickname: '本地明确测试账号', sourceChannel: 'test' }));
  const at = new Date(Date.now() - 120000); const day = new Date(+at + 8 * 3600000).toISOString().slice(0, 10);
  const activityRepo = ds.getRepository('Activity');
  async function activity(title, isTest = false) { return activityRepo.save(activityRepo.create({ tenant, title, isTest, description: '隔离本地统计验收数据，非真实活动。', location: '本地', startTime: new Date(Date.now() + 86400000), endTime: new Date(Date.now() + 90000000), registrationDeadline: new Date(Date.now() + 3600000), capacity: 10, price: '100.00', status: 'open', featured: false, requireReview: false, allowCancel: true })); }
  const a = await activity('本地报表A'); const b = await activity('本地报表B'); const empty = await activity('本地报表空场次'); const test = await activity('本地报表测试场次', true);
  const channelRepo = ds.getRepository('ActivityChannel'); const channel = await channelRepo.save(channelRepo.create({ activity: a, tenant, code: randomUUID(), name: '本地来源A', enabled: true })); const zeroChannel = await channelRepo.save(channelRepo.create({ activity: empty, tenant, code: randomUUID(), name: '本地空渠道', enabled: true }));
  const eventRepo = ds.getRepository('ConversionEvent');
  async function purchase(act, user, amount, refunded = 0, legacyZero = false, eventAt = at, refundAt = at) {
    const fullyRefunded = amount > 0 && refunded === amount;
    const registrations = ds.getRepository('Registration'); const registration = await registrations.save(registrations.create({ activity: act, tenant, user, channel: act.id === a.id ? channel : null, status: fullyRefunded ? 'cancelled' : 'approved', checkInCode: randomUUID(), answers: [], createdAt: eventAt }));
    const orders = ds.getRepository('Order'); const order = await orders.save(orders.create({ registration, tenant, orderNo: `REPORT-${randomUUID()}`, amount: amount.toFixed(2), originalAmount: amount.toFixed(2), paymentMethod: amount ? 'offline' : 'free', status: fullyRefunded ? 'refunded' : refunded ? 'partially_refunded' : 'paid', paidAt: eventAt }));
    const common = { tenant, activity: act, user, registration, order, channel: act.id === a.id ? channel : null, createdAt: eventAt, source: 'report-fixture' };
    await eventRepo.save(eventRepo.create({ ...common, type: 'register', amount: '0.00' }));
    const pay = await eventRepo.save(eventRepo.create({ ...common, type: 'pay', amount: legacyZero ? '0.00' : amount.toFixed(2) }));
    if (refunded) {
      const refunds = ds.getRepository('Refund'); await refunds.save(refunds.create({ order, tenant, refundNo: `REPORT-${randomUUID()}`, amount: refunded.toFixed(2), status: 'completed', completedAt: refundAt }));
      await eventRepo.save(eventRepo.create({ ...common, createdAt: refundAt, type: 'refund', amount: (-refunded).toFixed(2) }));
    }
    return pay;
  }
  const legacy = await purchase(a, buyer, 100, 0, true); await purchase(b, buyer, 50, 20); await purchase(a, free, 0); await purchase(b, free, 0); await purchase(test, buyer, 999); await purchase(a, tester, 888);
  const historical = await activity('本地历史全退场次'); await purchase(historical, buyer, 200, 200, false, new Date(+at - 3 * 86400000), at);
  await eventRepo.save(eventRepo.create({ tenant, activity: empty, user: buyer, channel: zeroChannel, type: 'view', amount: '0.00', createdAt: new Date(+at - 3 * 86400000) }));
  const scope = `tenantId=${tenant.id}&startDate=${day}&endDate=${day}`;
  const metricRepo = ds.getRepository('AnalyticsDailyMetric'); await metricRepo.save(metricRepo.create({ tenantScopeKey: `tenant:${tenant.id}`, metricDate: day, dimensionType: 'tenant', dimensionKey: String(tenant.id), metricKey: 'payments_succeeded', value: '999', amountFen: '99900', calculationVersion: 'activity-metrics-v1', sourceRunId: 'legacy-fixture' }));
  const runRepo = ds.getRepository('AnalyticsCalculationRun'); await runRepo.save(runRepo.create({ runId: `OLD-${randomUUID()}`, tenantScopeKey: `tenant:${tenant.id}`, startDate: day, endDate: day, status: 'completed', mismatchCount: 0, validationSummary: { calculationVersion: 'activity-metrics-v1' } }));
  const before = await raw(`/admin/analytics/overview?${scope}`, token); assert.equal(before.status, 200, JSON.stringify(before.json));
  assert.equal(before.json.data.metricSource, 'live_tables'); assert.equal(before.json.data.totals.paidCount, 4); assert.equal(before.json.data.totals.paidAmount, '150.00'); assert.equal(before.json.data.totals.netAmount, '-70.00');
  const liveChannels = await raw(`/admin/analytics/channels?${scope}`, token); assert.equal(liveChannels.json.data.find(row => row.id === zeroChannel.id).paidAmount, '0.00');
  const growth = await raw(`/admin/analytics/growth?${scope}`, token); assert.equal(growth.status, 200, JSON.stringify(growth.json)); assert.equal(growth.json.data.cohort.paidUsers, 1); assert.equal(growth.json.data.cohort.repeatPaidUsers, 1);
  const rank = await raw(`/admin/analytics/overview?startDate=${day}&endDate=${day}`, token); const ranked = rank.json.data.tenantRanking.find(row => row.tenantId === tenant.id); assert.equal(ranked.paidAmount, '150.00');
  const recomputed = await raw('/admin/analytics/recompute', token, 'POST', { tenantId: tenant.id, startDate: day, endDate: day }); assert.equal(recomputed.status, 201, JSON.stringify(recomputed.json)); assert.equal(recomputed.json.data.mismatchCount, 0);
  const after = await raw(`/admin/analytics/overview?${scope}`, token); assert.equal(after.json.data.metricSource, 'daily_metrics'); assert.deepEqual(after.json.data.totals, before.json.data.totals);
  const channels = await raw(`/admin/analytics/channels?${scope}`, token); assert.equal(channels.json.data.find(row => row.id === channel.id).paidAmount, '100.00'); assert.equal(channels.json.data.find(row => row.id === zeroChannel.id).paidAmount, '0.00');
  const trend = await raw(`/admin/analytics/trends?${scope}`, token); assert.equal(trend.json.data[0].paidAmount, '150.00'); assert.equal(trend.json.data[0].refundAmount, '220.00');
  const admins = ds.getRepository('AdminUser'); const limited = await admins.save(admins.create({ username: `report_limited_${Date.now()}`, tenant, role: 'operator', permissions: ['analytics.view', 'analytics.manage', 'analytics.export'], dataScope: { type: 'activity_ids', activityIds: [a.id] }, enabled: true, passwordHash: await require('bcryptjs').hash(state.adminPassword, 10) }));
  const limitedToken = await login(limited.username);
  const limitedRows = await raw(`/admin/analytics/metrics?${scope}`, limitedToken); assert.equal(limitedRows.status, 200, JSON.stringify(limitedRows.json)); assert(limitedRows.json.data.every(row => row.dimensionType === 'activity' && row.dimensionKey === String(a.id) || row.dimensionType === 'channel' && row.dimensionKey === String(channel.id)));
  const limitedOverview = await raw(`/admin/analytics/overview?${scope}`, limitedToken); assert.equal(limitedOverview.json.data.totals.paidAmount, '100.00'); assert.equal(limitedOverview.json.data.ancillaryScopeAvailable, false);
  assert.equal((await raw('/admin/analytics/recompute', limitedToken, 'POST', { startDate: day, endDate: day })).status, 403);
  assert.equal((await raw(`/admin/analytics/overview?activityId=${b.id}`, limitedToken)).status, 404);
  const funnel = await raw(`/admin/activities/${a.id}/funnel`, token); assert.equal(funnel.status, 200, JSON.stringify(funnel.json)); assert.equal(funnel.json.data.funnel.grossAmountFen, 10000);
  const testFunnel = await raw(`/admin/activities/${test.id}/funnel`, token); assert.equal(testFunnel.json.data.reportingScope, 'test'); assert.equal(testFunnel.json.data.funnel.grossAmountFen, 99900);
  assert.equal((await eventRepo.findOneOrFail({ where: { id: legacy.id }, loadEagerRelations: false })).amount, '0.00');
  console.log(JSON.stringify({ passed: ['实时和v2重算缓存一致', '旧缓存不会污染新口径', '免费不算付费复购', '测试账号和测试活动不进入正式统计', '排行榜无笛卡尔重复', '无流量渠道保留零值', '缓存读取及重算数据权限', '单活动测试口径与正式口径隔离', '原始旧事件未被修改'], tenantId: tenant.id, activities: [a.id, b.id, empty.id, test.id], runId: recomputed.json.data.runId }, null, 2));
} finally { await ds.destroy(); }
