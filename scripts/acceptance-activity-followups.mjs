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
const base = 'http://127.0.0.1:3010/api';
async function raw(route, token, method = 'GET', data) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  return { status: response.status, json: await response.json() };
}
async function login(username) {
  const r = await raw('/admin/auth/login', null, 'POST', { username, password: state.adminPassword }); assert.equal(r.status, 201); return r.json.data.token;
}
try {
  const token = await login(state.adminUsername);
  const tenant = await ds.getRepository('Tenant').findOneByOrFail({ code: 'qiwai-showcase' });
  const actor = await ds.getRepository('AdminUser').findOneByOrFail({ username: state.adminUsername });
  const user = await ds.getRepository('User').findOneByOrFail({ nickname: '本地验收名片（非真实用户）' });
  const activities = ds.getRepository('Activity');
  const source = activities.create({ tenant, title: `仅本地跟进验收 ${Date.now()}`, description: '历史参与记录测试，不代表真实活动。', location: '本地验收', startTime: new Date(Date.now() - 2 * 86400000), endTime: new Date(Date.now() - 86400000), registrationDeadline: new Date(Date.now() - 3 * 86400000), capacity: 10, price: '0.00', status: 'ended', featured: false, requireReview: false, allowCancel: true });
  const activity = await activities.save(source);
  const registrations = ds.getRepository('Registration');
  const registration = await registrations.save(registrations.create({ activity, tenant, user, status: 'checked_in', checkInCode: randomUUID(), answers: [], formSchemaVersion: 1 }));
  const pending = await registrations.save(registrations.create({ activity, tenant, user, status: 'approved', checkInCode: randomUUID(), answers: [], formSchemaVersion: 1 }));
  const before = await ds.getRepository('Notification').count();
  const url = `/admin/activities/${activity.id}/followups`;
  const body = { registrationId: registration.id, assigneeId: actor.id, revision: 0, kind: 'feedback', status: 'pending', dueAt: new Date(Date.now() + 86400000).toISOString(), outcome: '' };
  const concurrent = await Promise.all([0, 1].map(() => raw(url, token, 'PUT', body)));
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
  const saved = concurrent.find(r => r.status === 200).json.data;
  const done = await raw(url, token, 'PUT', { ...body, revision: saved.revision, status: 'done', outcome: '本地验收：已记录参与反馈，无对外联系。' });
  assert.equal(done.status, 200);
  const declined = await raw(url, token, 'PUT', { ...body, kind: 'return_visit', status: 'declined', outcome: '本地验收：用户拒绝本项回访。' });
  assert.equal(declined.status, 200);
  assert.equal((await raw(url, token, 'PUT', { ...body, kind: 'return_visit', revision: 1 })).status, 400);
  assert.equal((await raw(url, token, 'PUT', { ...body, registrationId: pending.id })).status, 404);
  const otherToken = await login('operations_other_finance');
  assert([403, 404].includes((await raw(url, otherToken)).status));
  assert([403, 404].includes((await raw(url, otherToken, 'PUT', body)).status));
  const list = (await raw(url, token)).json.data;
  assert.equal(list.total, 2); assert(list.candidates.some(row => row.id === registration.id)); assert(!list.candidates.some(row => row.id === pending.id));
  assert.equal(await ds.getRepository('Notification').count(), before);
  console.log(JSON.stringify({ passed: ['只为已结束且已签到报名创建跟进', '并发创建无重复', '记录负责人、结果与到期时间', '拒绝项不可重新开启', '跨商家权限阻断', '无额外通知发送'], activityId: activity.id, registrationId: registration.id, taskIds: list.items.map(row => row.id) }, null, 2));
} finally { await ds.destroy(); }
