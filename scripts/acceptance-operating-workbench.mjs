import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('apps/api/package.json'));
const state = JSON.parse(fs.readFileSync('.local-logs/operations-20260905/runtime.json', 'utf8'));
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '13316', DB_USERNAME: 'root', DB_PASSWORD: state.dbPassword, DB_DATABASE: 'activity_operations' });
const ds = require(path.resolve('apps/api/dist/data-source.js')).default;
await ds.initialize();
async function raw(route, token, method = 'GET', data) {
  const r = await fetch('http://127.0.0.1:3010/api' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  return { status: r.status, json: await r.json() };
}
async function login(username) { const r = await raw('/admin/auth/login', null, 'POST', { username, password: state.adminPassword }); assert.equal(r.status, 201); return r.json.data.token; }
try {
  const tenant = await ds.getRepository('Tenant').findOneByOrFail({ code: 'qiwai-showcase' });
  const source = await ds.getRepository('Activity').createQueryBuilder('a').where('a.tenantId = :id', { id: tenant.id }).andWhere("a.title LIKE '本地验收：渠道计算-%'").orderBy('a.id', 'DESC').getOneOrFail();
  const pendingSource = await ds.getRepository('Registration').createQueryBuilder('r').innerJoinAndSelect('r.activity', 'a')
    .where('a.tenantId = :tenantId', { tenantId: tenant.id }).andWhere('a.id <> :id', { id: source.id }).andWhere("r.status = 'checked_in'").andWhere('a.endTime < :now', { now: new Date() }).orderBy('r.id', 'DESC').getOneOrFail();
  const actor = await ds.getRepository('AdminUser').findOneByOrFail({ username: state.adminUsername });
  const followupRepo = ds.getRepository('ActivityFollowup');
  if (!(await followupRepo.findOneBy({ registrationId: pendingSource.id, kind: 'next_activity' }))) await followupRepo.save(followupRepo.create({ activityId: pendingSource.activity.id, registrationId: pendingSource.id, assigneeId: actor.id, kind: 'next_activity', status: 'pending', dueAt: new Date(), outcome: '本地范围隔离验收待办', revision: 1 }));
  const now = new Date(); const shifted = new Date(+now + 8 * 3600000); shifted.setUTCDate(shifted.getUTCDate() - (shifted.getUTCDay() + 6) % 7); const monday = shifted.toISOString().slice(0, 10);
  const results = [];
  for (const spec of [
    { key: 'finance', role: 'finance', permissions: ['dashboard.view', 'activity.view', 'registration.view', 'finance.view'], ids: [source.id] },
    { key: 'operator', role: 'operator', permissions: ['dashboard.view', 'activity.view', 'registration.view'], ids: [source.id] },
    { key: 'writeonly', role: 'finance', permissions: ['dashboard.view', 'activity.view', 'finance.manage'], ids: [source.id] },
    { key: 'empty', role: 'operator', permissions: ['dashboard.view', 'activity.view', 'registration.view'], ids: [] }
  ]) {
    const repo = ds.getRepository('AdminUser');
    const account = await repo.save(repo.create({ username: `workbench_${spec.key}_${Date.now()}`, role: spec.role, permissions: spec.permissions, tenant, enabled: true, passwordHash: await require('bcryptjs').hash(state.adminPassword, 10), dataScope: { type: 'activity_ids', activityIds: spec.ids } }));
    const token = await login(account.username);
    const response = await raw(`/admin/operations/workbench?weekStart=${monday}`, token); assert.equal(response.status, 200, JSON.stringify(response.json));
    const report = response.json.data;
    assert(!/"(?:passwordHash|smsAccessKeySecret|contactPhone)":/.test(JSON.stringify(report)));
    assert.equal(report.tenant.id, tenant.id); assert(report.tasks.every(row => spec.ids.includes(row.activityId)));
    assert(report.firstActivities.every(row => spec.ids.includes(row.id)));
    if (spec.key === 'finance') assert.deepEqual(report.weekly.financial, { receivedFen: 40000, refundedFen: 12500, netCashFen: 27500 });
    else assert.equal(report.weekly.financial, null);
    if (spec.key === 'empty') assert.equal(report.weekly.newRegistrations, 0);
    const dashboard = await raw('/admin/dashboard', token); assert.equal(dashboard.status, 200, JSON.stringify(dashboard.json));
    assert.equal(dashboard.json.data.totals.activityCount, spec.ids.length);
    assert(dashboard.json.data.recentActivities.every(row => spec.ids.includes(row.id)));
    if (spec.key !== 'finance') {
      assert.equal(dashboard.json.data.totals.paidAmount, null);
      assert(dashboard.json.data.recentActivities.every(row => row.netAmount === null));
    }
    if (spec.key === 'writeonly') {
      assert.equal((await raw(`/admin/activities/${source.id}/operation`, token)).status, 403);
      assert.equal((await raw(`/admin/activities/${source.id}/operation`, token, 'PUT', { revision: 0, plan: { mode: 'self', owner: '', budgetFen: 0, targetRevenueFen: 0, entries: [], checklist: [], note: '' } })).status, 403);
    }
    assert.equal((await raw(`/admin/operations/workbench?tenantId=${tenant.id + 1000}`, token)).status, 403);
    results.push({ account: account.username, role: spec.key, sourceId: source.id, passed: true });
  }
  const admin = await login(state.adminUsername);
  assert.equal((await raw('/admin/operations/workbench', admin)).json.data.selectTenant, true);
  assert.equal((await raw(`/admin/operations/workbench?tenantId=${tenant.id}&weekStart=2099-01-05`, admin)).status, 400);
  const activityDto = { tenantId: tenant.id, title: source.title, description: source.description, location: source.location, startTime: source.startTime.toISOString(), endTime: source.endTime.toISOString(), registrationDeadline: source.registrationDeadline.toISOString(), capacity: source.capacity, price: 100, status: 'draft', featured: false, requireReview: false, allowCancel: true, isTest: true, fields: [{ label: '姓名', type: 'text', required: true, sortOrder: 1, options: [] }] };
  const reclassify = await raw(`/admin/activities/${source.id}`, admin, 'PUT', activityDto); assert.equal(reclassify.status, 400); assert.match(JSON.stringify(reclassify.json), /测试标记/);
  console.log(JSON.stringify({ passed: ['周报正确按北京时间周一分段', '退款按完成时间计入', '金额受财务权限保护', '旧工作台与新周报均限制活动范围', '跨商家请求被拒绝', '测试标记不可回改'], accounts: results }, null, 2));
} finally { await ds.destroy(); }
