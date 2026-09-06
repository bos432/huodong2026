import fs from 'node:fs';
import assert from 'node:assert/strict';

const state = JSON.parse(fs.readFileSync('.local-logs/operations-20260905/runtime.json', 'utf8'));
const base = 'http://127.0.0.1:3010/api';
async function raw(route, token, method = 'GET', data) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  return { status: response.status, json: await response.json() };
}
async function login(username) {
  const result = await raw('/admin/auth/login', null, 'POST', { username, password: state.adminPassword });
  assert.equal(result.status, 201); return result.json.data.token;
}
const token = await login(state.adminUsername);
const options = (await raw('/admin/activities/options', token)).json.data;
const tenant = options.tenants.find(row => row.code === 'qiwai-showcase'); assert(tenant);
const start = Date.now() + 28 * 86400000;
const slot = (days) => ({ startTime: new Date(start + days * 86400000).toISOString(), endTime: new Date(start + days * 86400000 + 7200000).toISOString(), registrationDeadline: new Date(start + (days - 1) * 86400000).toISOString(), location: '本地验收场地（非真实活动）' });
const sourceData = { tenantId: tenant.id, title: `本地系列验收 ${new Date().toISOString()}`, description: '仅供本地流程测试，不代表真实举办的活动。请勿用于生产运营。', notice: '仅限本地测试，测试数据保留。', ...slot(0), capacity: 12, price: 0, status: 'draft', featured: false, requireReview: false, allowCancel: true, fields: [{ label: '姓名', type: 'text', required: true, sortOrder: 1, options: [] }], sections: [{ type: 'agenda', title: '测试流程', content: '查看、报名、返回。', sortOrder: 1 }], hosts: [] };
const created = await raw('/admin/activities', token, 'POST', sourceData); assert.equal(created.status, 201);
const sourceId = created.json.data.id;
const request = { title: '本地验收共读系列', revision: 0, sessions: [slot(2), slot(4)] };
const results = await Promise.all([0, 1].map(() => raw(`/admin/activities/${sourceId}/series`, token, 'POST', request)));
assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
const series = results.find(r => r.status === 201).json.data;
assert.equal(series.createdActivityIds.length, 2); assert.equal(series.sessions.length, 3);
const [firstId, secondId] = series.createdActivityIds;
const first = (await raw(`/admin/activities/${firstId}`, token)).json.data;
assert.equal(first.status, 'draft'); assert.equal(first.capacity, 12); assert(first.fields.length === 1);
const overlap = await raw(`/admin/activities/${sourceId}/series`, token, 'POST', { ...request, revision: series.revision, sessions: [slot(2)] });
assert.equal(overlap.status, 400);
const otherToken = await login('operations_other_finance');
assert([403, 404].includes((await raw(`/admin/activities/${sourceId}/series`, otherToken)).status));
assert([403, 404].includes((await raw(`/admin/activities/${sourceId}/series`, otherToken, 'POST', { ...request, revision: 1 })).status));
for (const [id, data] of [[sourceId, sourceData], [firstId, { ...sourceData, ...slot(2), title: first.title }]]) {
  const published = await raw(`/admin/activities/${id}`, token, 'PUT', { ...data, status: 'open' });
  assert.equal(published.status, 200, JSON.stringify(published.json.message));
}
const publicDetail = await raw(`/public/activities/${sourceId}/enhanced?tenantCode=qiwai-showcase`);
assert.equal(publicDetail.status, 200);
assert(publicDetail.json.data.seriesActivities.some(row => row.id === firstId));
assert(!publicDetail.json.data.seriesActivities.some(row => row.id === secondId));
const memberCounts = (await raw(`/admin/activities/${secondId}`, token)).json.data;
assert.equal(Number(memberCounts.registeredCount || 0), 0);
console.log(JSON.stringify({ passed: ['同时排期一成功一冲突，无重复场次', '新场次草稿与独立名额，无报名复制', '同系列时间重叠返回400', '跨商家读写禁止', '公开详情仅返回已发布同系列场次'], sourceId, seriesId: series.seriesId, firstId, secondId }, null, 2));
