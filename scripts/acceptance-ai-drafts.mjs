import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const require = createRequire(path.resolve('apps/api/package.json'));
const state = JSON.parse(fs.readFileSync('.local-logs/operations-20260905/runtime.json', 'utf8'));
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '13316', DB_USERNAME: 'root', DB_PASSWORD: state.dbPassword, DB_DATABASE: 'activity_operations' });
require('reflect-metadata');
const ds = require(path.resolve('apps/api/dist/data-source.js')).default;
const { ConfigService } = require('@nestjs/config');
const { AiOperationService } = require(path.resolve('apps/api/dist/modules/admin/ai-operation.service.js'));
const captured = []; let mode = 'ok';
const server = createServer((req, res) => {
  let body = ''; req.on('data', chunk => body += chunk); req.on('end', () => {
    captured.push(JSON.parse(body)); res.setHeader('Content-Type', 'application/json');
    if (mode === 'hang') return;
    if (mode === 'error') { res.statusCode = 503; return res.end(JSON.stringify({ error: 'never-expose-provider-secret' })); }
    if (mode === 'huge') return res.end(JSON.stringify({ padding: 'x'.repeat(140000) }));
    if (mode === 'malformed') return res.end('not json');
    res.end(JSON.stringify({ model: 'local-fixture', choices: [{ message: { content: '本地模拟草稿：请按已确认时间组织活动，未确认资料继续核对。' }, finish_reason: mode === 'truncated' ? 'length' : 'stop' }], usage: { total_tokens: 123 } }));
  });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
await ds.initialize();
try {
  const tenant = await ds.getRepository('Tenant').findOneByOrFail({ code: 'qiwai-showcase' });
  const adminRepo = ds.getRepository('AdminUser');
  const actor = await adminRepo.save(adminRepo.create({ username: `ai_mock_${Date.now()}`, role: 'operator', tenant, permissions: ['activity.manage', 'activity.view'], enabled: true, passwordHash: await require('bcryptjs').hash(state.adminPassword, 10) }));
  const activities = ds.getRepository('Activity');
  const activity = await activities.save(activities.create({ tenant, title: '仅本地AI联调活动', isTest: true, description: '邮箱 test@example.com 手机 13812345678 链接 https://example.com/private?token=secret', notice: '不自动发布', location: '本地测试', startTime: new Date(Date.now() + 86400000), endTime: new Date(Date.now() + 90000000), registrationDeadline: new Date(Date.now() + 3600000), capacity: 10, price: '49.00', status: 'draft', featured: false, requireReview: false, allowCancel: true }));
  const source = { ...activity, participants: ['private-person'], groupQrCodeUrl: 'private-qr', registeredCount: 0 };
  const config = new ConfigService({ AI_ENABLED: 'true', AI_API_BASE: `http://127.0.0.1:${server.address().port}`, AI_MODEL: 'local-fixture', AI_API_KEY: 'fake-local-key', AI_ALLOW_LOCAL_TEST_SERVER: 'true', AI_REQUEST_TIMEOUT_MS: 1000, AI_REQUESTS_PER_ADMIN_DAY: 6, NODE_ENV: 'development' });
  const service = new AiOperationService(config, ds);
  const input = { mode: 'activity_copy', question: '不要发送 Bearer abcdef0123456789' };
  const preview = service.preview(source, input);
  assert.equal(preview.simulation, true); assert.equal(preview.configured, true);
  assert(!JSON.stringify(preview).includes('fake-local-key'));
  const request = { ...input, previewHash: preview.previewHash, requestKey: randomUUID(), consent: true };
  await assert.rejects(service.generate(source, { ...request, consent: false }, actor), /确认/);
  await assert.rejects(service.generate({ ...source, title: 'changed' }, request, actor), /变化/);
  const beforeNotifications = await ds.getRepository('Notification').count();
  const duplicate = await Promise.all([service.generate(source, request, actor), service.generate(source, request, actor)]);
  assert.equal(captured.length, 1); assert.equal(duplicate[0].id, duplicate[1].id);
  assert.equal((await service.generate(source, request, actor)).status, 'succeeded'); assert.equal(captured.length, 1);
  const sent = JSON.stringify(captured[0].messages);
  for (const forbidden of ['test@example.com', '13812345678', 'private-person', 'private-qr', 'abcdef0123456789']) assert(!sent.includes(forbidden));
  for (const responseMode of ['error', 'huge', 'hang', 'malformed', 'truncated']) {
    mode = responseMode;
    const next = { ...request, requestKey: randomUUID() };
    const failed = await service.generate(source, next, actor);
    assert.equal(failed.status, 'failed', responseMode); assert(!failed.error.includes('never-expose-provider-secret'));
    const count = captured.length; await service.generate(source, next, actor); assert.equal(captured.length, count);
  }
  await assert.rejects(service.generate(source, { ...request, requestKey: randomUUID() }, actor), /次数上限/);
  assert.equal(captured.length, 6);
  const repo = ds.getRepository('AiOperationDraft');
  const abandoned = await repo.save(repo.create({ requestKey: randomUUID(), activityId: activity.id, actorId: actor.id, tenantScopeKey: `tenant:${tenant.id}`, mode: input.mode, payloadHash: preview.previewHash, sourceSnapshot: preview.source, status: 'pending', model: 'local-fixture', providerHost: '127.0.0.1', simulation: true, createdAt: new Date(Date.now() - 180000) }));
  const history = await service.list(source);
  assert.equal(history.items.find(row => row.id === abandoned.id).status, 'failed'); assert.equal(captured.length, 6);
  assert.equal(await ds.getRepository('Notification').count(), beforeNotifications);
  const unchanged = await activities.findOneByOrFail({ id: activity.id }); assert.equal(unchanged.status, 'draft'); assert.equal(unchanged.title, activity.title);
  const disabled = new AiOperationService(new ConfigService({ AI_ENABLED: 'false' }), ds);
  assert.equal(disabled.preview(source, input).configured, false);
  console.log(JSON.stringify({ passed: ['预览脱敏与确认', '资料变化阻断', '并发及重复请求只调用模型一次', '失败/超时/超长/格式错误/截断不自动重试', '次数限制', '崩溃遗留请求过期', '活动及通知不自动修改', '模拟标记与配置关闭'], activityId: activity.id, actorId: actor.id, draftIds: history.items.map(row => row.id), mockRequests: captured.length }, null, 2));
} finally { await ds.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
