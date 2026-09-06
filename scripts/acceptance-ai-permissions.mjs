import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('apps/api/package.json'));
const state = JSON.parse(fs.readFileSync('.local-logs/operations-20260905/runtime.json', 'utf8'));
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '13316', DB_USERNAME: 'root', DB_PASSWORD: state.dbPassword, DB_DATABASE: 'activity_operations' });
const ds = require(path.resolve('apps/api/dist/data-source.js')).default; await ds.initialize();
async function raw(route, token, method = 'GET', data) {
  const response = await fetch('http://127.0.0.1:3010/api' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  return { status: response.status, json: await response.json() };
}
async function login(username) { const result = await raw('/admin/auth/login', null, 'POST', { username, password: state.adminPassword }); assert.equal(result.status, 201); return result.json.data.token; }
try {
  const activity = await ds.getRepository('Activity').findOneOrFail({ where: { title: '仅本地AI联调活动' }, order: { id: 'DESC' } });
  const tenant = await ds.getRepository('Tenant').findOneByOrFail({ code: 'qiwai-showcase' });
  const other = await ds.getRepository('Tenant').findOneByOrFail({ code: 'operations-other-local' });
  for (const spec of [{ name: 'other', tenant: other, permissions: ['activity.manage', 'activity.view'], dataScope: { type: 'all' } }, { name: 'limited', tenant, permissions: ['activity.manage', 'activity.view'], dataScope: { type: 'activity_ids', activityIds: [] } }, { name: 'readonly', tenant, permissions: ['activity.view'], dataScope: { type: 'all' } }]) {
    const repo = ds.getRepository('AdminUser');
    const user = await repo.save(repo.create({ username: `ai_scope_${spec.name}_${Date.now()}`, role: 'operator', tenant: spec.tenant, permissions: spec.permissions, dataScope: spec.dataScope, enabled: true, passwordHash: await require('bcryptjs').hash(state.adminPassword, 10) }));
    const token = await login(user.username);
    for (const [suffix, method, body] of [['', 'GET', undefined], ['/preview', 'POST', { mode: 'recap', question: '' }], ['', 'POST', { mode: 'recap', question: '' }]]) assert([403, 404].includes((await raw(`/admin/activities/${activity.id}/ai-drafts${suffix}`, token, method, body)).status));
  }
  assert.equal((await raw(`/admin/activities/${activity.id}/ai-drafts`, null)).status, 401);
  const token = await login(state.adminUsername);
  const preview = await raw(`/admin/activities/${activity.id}/ai-drafts/preview`, token, 'POST', { mode: 'recap', question: '' });
  assert.equal(preview.status, 201); assert.equal(preview.json.data.configured, false);
  const before = await ds.getRepository('AiOperationDraft').count();
  const disabled = await raw(`/admin/activities/${activity.id}/ai-drafts`, token, 'POST', { mode: 'recap', question: '', previewHash: preview.json.data.previewHash, requestKey: `disabled_${Date.now()}`, consent: true });
  assert.equal(disabled.status, 503); assert.equal(await ds.getRepository('AiOperationDraft').count(), before);
  console.log(JSON.stringify({ passed: ['匿名和只读账号禁止调用', '跨商家与空活动范围禁止调用', '配置缺失可预览但不可生成', '禁用时不创建调用记录'], activityId: activity.id }, null, 2));
} finally { await ds.destroy(); }
