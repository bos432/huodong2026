import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const require = createRequire(path.join(root, 'apps/api/package.json'));
const state = JSON.parse(fs.readFileSync(path.join(root, '.local-logs/operations-20260905/runtime.json'), 'utf8'));
const base = 'http://127.0.0.1:3010/api';
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '13316', DB_USERNAME: 'root', DB_PASSWORD: state.dbPassword, DB_DATABASE: 'activity_operations' });
const ds = require(path.join(root, 'apps/api/dist/data-source.js')).default;
await ds.initialize();
const results = [];
async function raw(route, token, method = 'GET', data) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  return { status: response.status, json: await response.json() };
}
async function login(username) {
  const r = await raw('/admin/auth/login', null, 'POST', { username, password: state.adminPassword });
  assert.equal(r.status, 201); return r.json.data.token;
}
try {
  const token = await login(state.adminUsername);
  const seed = spawnSync(process.execPath, ['scripts/seed-activity-starter-pack.mjs', '--apply'], { env: { ...process.env, API_BASE: base, TENANT_CODE: 'qiwai-showcase', ADMIN_TOKEN: token }, encoding: 'utf8', windowsHide: true });
  assert.equal(seed.status, 0, seed.stderr); assert.match(seed.stdout, /"created":0/); results.push('重复导入：0新增');
  const tenants = ds.getRepository('Tenant'); const tenant = await tenants.findOneByOrFail({ code: 'qiwai-showcase' });
  let other = await tenants.findOneBy({ code: 'operations-other-local' });
  if (!other) other = await tenants.save(tenants.create({ code: 'operations-other-local', name: '本地隔离验收商家', enabled: true, settings: {} }));
  const all = await ds.getRepository('Activity').find({ where: { tenant: { id: tenant.id } } });
  const drafts = all.filter(a => a.title.startsWith('【策划草稿】'));
  assert.equal(drafts.length, 8); assert(drafts.every(a => a.status === 'draft')); results.push('8场草稿已保存');
  const publicList = await raw('/public/activities?tenantCode=qiwai-showcase&pageSize=100');
  assert.equal(publicList.status, 200); assert(!JSON.stringify(publicList.json).includes('【策划草稿】')); results.push('公开列表无策划草稿');
  const id = drafts[0].id;
  const check = await raw(`/admin/activities/${id}/publish-check`, token);
  assert.equal(check.json.data.passed, false); assert(check.json.data.issues.some(i => i.field === 'planning')); results.push('草稿发布检查阻断');
  const before = (await raw(`/admin/activities/${id}/operation`, token)).json.data;
  const update = await raw(`/admin/activities/${id}/operation`, token, 'PUT', { revision: before.revision, plan: before.plan });
  assert.equal(update.status, 200); assert.equal(update.json.data.revision, before.revision + 1);
  const stale = await raw(`/admin/activities/${id}/operation`, token, 'PUT', { revision: before.revision, plan: before.plan });
  assert.equal(stale.status, 409); results.push('旧版本保存返回409，历史版本保留');
  const concurrent = await Promise.all([0, 1].map(() => raw(`/admin/activities/${id}/operation`, token, 'PUT', { revision: update.json.data.revision, plan: before.plan })));
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]); results.push('同时保存：一项成功，另一项冲突');
  assert.equal((await raw(`/admin/activities/${id}/operation`)).status, 401); results.push('未登录不可读取经营数据');
  const invalid = await raw(`/admin/activities/${id}/operation`, token, 'PUT', { revision: update.json.data.revision, plan: { ...before.plan, budgetFen: -1 } });
  assert.equal(invalid.status, 400); results.push('非法金额返回400');
  const adminRepo = ds.getRepository('AdminUser');
  for (const spec of [
    { username: 'operations_other_finance', role: 'finance', tenant: other, permissions: ['finance.view', 'finance.manage'] },
    { username: 'operations_view_only', role: 'operator', tenant, permissions: ['activity.view'] },
    { username: 'operations_limited_finance', role: 'finance', tenant, permissions: ['finance.view', 'finance.manage'], dataScope: { type: 'activity_ids', activityIds: [] } }
  ]) {
    if (!(await adminRepo.findOneBy({ username: spec.username }))) await adminRepo.save(adminRepo.create({ ...spec, enabled: true, passwordHash: await require('bcryptjs').hash(state.adminPassword, 10) }));
    const scopedToken = await login(spec.username);
    const read = await raw(`/admin/activities/${id}/operation`, scopedToken);
    const write = await raw(`/admin/activities/${id}/operation`, scopedToken, 'PUT', { revision: update.json.data.revision, plan: before.plan });
    assert([403, 404].includes(read.status), `${spec.username} read: ${read.status}`);
    assert([403, 404].includes(write.status), `${spec.username} write: ${write.status}`);
  }
  results.push('跨商家、无财务权限、活动范围受限账号均不可读写台账');
  const users = ds.getRepository('User');
  let user = await users.findOneBy({ nickname: '本地验收名片（非真实用户）' });
  if (!user) user = await users.save(users.create({ nickname: '本地验收名片（非真实用户）' }));
  const cards = ds.getRepository('SocialProfile');
  let card = await cards.findOneBy({ userId: user.id, tenantScopeKey: `tenant:${tenant.id}` });
  card ||= cards.create({ userId: user.id, user, tenant, tenantScopeKey: `tenant:${tenant.id}` });
  Object.assign(card, { displayName: user.nickname, introduction: '本条为本地隔离环境的名片分享验收数据，不代表真实个人。', city: '本地测试', offers: ['活动策划'], needs: ['阅读交流'], status: 'approved', visible: true });
  card = await cards.save(card);
  const cardPath = `/public/social/profiles/${user.id}?tenantCode=qiwai-showcase`;
  const shared = await raw(cardPath); assert.equal(shared.status, 200); assert.equal(shared.json.data.userId, user.id); assert.equal(shared.json.data.status, undefined);
  assert(!('phone' in shared.json.data)); assert(!('openid' in shared.json.data));
  card.visible = false; await cards.save(card); assert.equal((await raw(cardPath)).status, 404);
  card.visible = true; card.status = 'pending'; await cards.save(card); assert.equal((await raw(cardPath)).status, 404);
  card.status = 'approved'; await cards.save(card);
  assert.equal((await raw(`/public/social/profiles/${user.id}?tenantCode=operations-other-local`)).status, 404);
  results.push('公开名片可访问；隐藏、未审核、跨商家访问返回404；无联系方式');
  console.log(JSON.stringify({ passed: results, draftIds: drafts.map(a => a.id), cardUserId: user.id }, null, 2));
} finally { await ds.destroy(); }
