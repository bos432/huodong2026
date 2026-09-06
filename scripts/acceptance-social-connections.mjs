import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomInt } from 'node:crypto';
const require = createRequire(path.resolve('apps/api/package.json'));
const statePath = '.local-logs/operations-20260905/runtime.json';
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '13316', DB_USERNAME: 'root', DB_PASSWORD: state.dbPassword, DB_DATABASE: 'activity_operations' });
const ds = require(path.resolve('apps/api/dist/data-source.js')).default;
await ds.initialize();
async function raw(route, token, method = 'GET', data, tenantCode = 'qiwai-showcase') {
  const r = await fetch(`http://127.0.0.1:3010/api${route}${route.includes('?') ? '&' : '?'}tenantCode=${tenantCode}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  const json = await r.json(); return { status: r.status, data: json.data, message: json.message };
}
const tokens = []; const users = [];
try {
  const tenant = await ds.getRepository('Tenant').findOneByOrFail({ code: 'qiwai-showcase' });
  const otherTenant = await ds.getRepository('Tenant').findOneByOrFail({ code: 'operations-other-local' });
  const profiles = ds.getRepository('SocialProfile'); const userRepo = ds.getRepository('User');
  const prefix = `199${randomInt(100000, 999999)}`;
  const passwordHash = await require('bcryptjs').hash(state.adminPassword, 10);
  for (let i = 0; i < 15; i++) {
    const user = await userRepo.save(userRepo.create({ phone: prefix + String(i).padStart(2, '0'), nickname: `本地同行${i}（测试${prefix.slice(-4)}）`, sourceChannel: 'test', passwordHash }));
    users.push(user);
    await profiles.save(profiles.create({ userId: user.id, user, tenant, tenantScopeKey: `tenant:${tenant.id}`, displayName: user.nickname, city: '本地测试', introduction: '仅用于隔离本地环境的同行连接测试，不代表真实个人。', offers: ['活动策划'], needs: ['阅读交流'], status: i === 14 ? 'pending' : 'approved', visible: true }));
    const login = await raw('/public/auth/password-login', null, 'POST', { phone: user.phone, password: state.adminPassword });
    assert.equal(login.status, 201, login.message); tokens.push(login.data.userAccessToken);
  }
  state.socialTestAccounts = users.map(user => ({ id: user.id, phone: user.phone, label: user.nickname }));
  fs.writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
  const before = await ds.getRepository('Notification').count();
  const request = (from, to) => raw('/public/me/social-connections', tokens[from], 'POST', { targetUserId: users[to].id, intent: 'reading' });
  const act = (who, row, action) => raw(`/public/me/social-connections/${row.id}/actions`, tokens[who], 'POST', { action, revision: row.revision });
  const list = (who, tenantCode) => raw('/public/me/social-connections', tokens[who], 'GET', undefined, tenantCode);
  assert.equal((await raw('/public/me/social-connections')).status, 401);
  assert.equal((await request(0, 0)).status, 400); assert.equal((await request(0, 14)).status, 403);
  const duplicate = await Promise.all([request(0, 1), request(0, 1)]);
  assert(duplicate.every(r => r.status === 201), JSON.stringify(duplicate)); assert.equal(duplicate[0].data.id, duplicate[1].data.id);
  let row = duplicate[0].data;
  assert.equal(row.status, 'pending'); assert(!row.actions.includes('accept'));
  const reversed = await request(1, 0); assert.equal(reversed.data.id, row.id); assert.equal(reversed.data.status, 'pending'); assert.equal(reversed.data.incoming, true);
  assert.equal((await act(0, row, 'accept')).status, 400); assert.equal((await act(2, row, 'accept')).status, 404);
  assert.equal((await raw(`/public/me/social-connections/${row.id}/actions`, tokens[1], 'POST', { action: 'accept', revision: row.revision }, otherTenant.code)).status, 404);
  const accepted = await act(1, row, 'accept'); assert.equal(accepted.status, 201, accepted.message); assert.equal(accepted.data.status, 'accepted');
  assert.equal((await act(0, row, 'withdraw')).status, 409); row = accepted.data;
  await profiles.update({ userId: users[1].id, tenantScopeKey: `tenant:${tenant.id}` }, { visible: false });
  const hidden = (await list(0)).data.items.find(r => r.id === row.id); assert.equal(hidden.otherUserId, null); assert.equal(hidden.displayName, '资料暂不可见');
  await profiles.update({ userId: users[1].id, tenantScopeKey: `tenant:${tenant.id}` }, { visible: true });
  row = (await act(1, row, 'block')).data; assert.equal((await request(0, 1)).status, 403);
  row = (await act(0, row, 'block')).data;
  row = (await act(0, row, 'unblock')).data; assert.equal((await request(0, 1)).status, 403);
  row = (await act(1, row, 'unblock')).data; assert.notEqual(row.status, 'accepted'); assert.equal((await request(0, 1)).status, 400);
  await ds.getRepository('SocialConnection').update(row.id, { closedAt: new Date(Date.now() - 8 * 86400000) });
  row = (await request(0, 1)).data; row = (await act(1, row, 'decline')).data; assert.equal(row.status, 'declined'); assert.equal((await request(0, 1)).status, 400);
  let connected = (await request(2, 3)).data; connected = (await act(3, connected, 'accept')).data;
  let expired = (await request(4, 5)).data;
  await ds.getRepository('SocialConnection').update(expired.id, { requestedAt: new Date(Date.now() - 15 * 86400000) });
  assert.equal((await act(5, expired, 'accept')).status, 400);
  assert.equal((await list(4)).data.items.find(r => r.id === expired.id).status, 'expired');
  expired = (await request(4, 5)).data;
  for (const target of [0, 1, 2, 3, 4, 5, 7, 8, 9, 10]) assert.equal((await request(6, target)).status, 201);
  assert.equal((await request(6, 11)).status, 400);
  for (const index of [6, 12]) await profiles.save(profiles.create({ userId: users[index].id, user: users[index], tenant: otherTenant, tenantScopeKey: `tenant:${otherTenant.id}`, displayName: users[index].nickname, introduction: '本地跨商家频率限制测试资料。', offers: ['策划'], needs: ['阅读'], status: 'approved', visible: true }));
  assert.equal((await raw('/public/me/social-connections', tokens[6], 'POST', { targetUserId: users[12].id, intent: 'reading' }, otherTenant.code)).status, 400);
  assert.equal((await list(0, otherTenant.code)).data.total, 0);
  for (const response of [(await list(0)), (await list(2)), (await list(5))]) assert(!/"(?:phone|wechat|passwordHash|lowUserId|highUserId|lowBlocked|highBlocked)":/.test(JSON.stringify(response.data)));
  assert.equal(await ds.getRepository('Notification').count(), before);
  assert(await ds.getRepository('SocialConnectionEvent').count({ where: { connectionId: row.id } }) >= 8);
  const unverifiedPhone = prefix + '99';
  assert.equal((await raw('/public/auth/password-login', null, 'POST', { phone: unverifiedPhone, password: state.adminPassword })).status, 400);
  assert.equal(await userRepo.count({ where: { phone: unverifiedPhone } }), 0);
  const settings = ds.getRepository('OperationSetting');
  const setting = await settings.findOneOrFail({ where: { tenant: { id: tenant.id } } });
  const originalLaunch = setting.launchConfig;
  try {
    await settings.update(setting.id, { launchConfig: { ...(originalLaunch || {}), featureGates: { ...(originalLaunch?.featureGates || {}), userContentSharing: false } } });
    const blocked = await list(0); assert.equal(blocked.status, 404); assert.match(blocked.message, /未开放/);
    const blockedWrite = await request(0, 2); assert.equal(blockedWrite.status, 404); assert.match(blockedWrite.message, /未开放/);
  } finally { await settings.update(setting.id, { launchConfig: originalLaunch }); }
  assert.equal((await list(0)).status, 200);
  console.log(JSON.stringify({ passed: ['匿名/未审核/自我申请拦截', '并发与反向申请不跳过同意', '第三人及跨商家不可操作', '隐藏资料不暴露名称和联系方式', '双向独立屏蔽与冷却', '过期申请不可接受', '每日申请上限跨商家生效', '操作事件保留且无外发通知', '密码登录不再替未验证手机号建号'], connectionIds: [row.id, connected.id, expired.id], userIds: users.map(user => user.id) }, null, 2));
} finally { await ds.destroy(); }
