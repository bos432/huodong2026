import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { acceptManpiActivityFlow } from './acceptance-manpi-activity-flow.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'apps/api/package.json'));
const local = path.join(root, '.local-logs', `manpi-member-acceptance-${Date.now()}`);
const dbPort = 13318;
const apiPort = 3018;
const executableRoot = 'C:/Program Files/MariaDB 12.3/bin';
const database = 'manpi_member_acceptance';
const runNamespace = randomBytes(6).toString('hex');
const cacheIndex = process.argv.indexOf('--schema-cache');
const freshMigrations = process.argv.includes('--fresh-migrations');
assert(!(freshMigrations && cacheIndex >= 0), '--fresh-migrations must start from an empty isolated database');
let schemaCache = null;
if (cacheIndex >= 0) {
  assert(process.argv[cacheIndex + 1], '--schema-cache requires a previously passed isolated test directory');
  const cacheRoot = fs.realpathSync(path.resolve(process.argv[cacheIndex + 1]));
  const logRoot = fs.realpathSync(path.join(root, '.local-logs'));
  assert(path.dirname(cacheRoot).toLowerCase() === logRoot.toLowerCase() && /^manpi-member-acceptance-\d+$/.test(path.basename(cacheRoot)), 'Schema cache must be an owned isolated acceptance directory');
  const previous = JSON.parse(fs.readFileSync(path.join(cacheRoot, 'runtime.json'), 'utf8'));
  const evidence = JSON.parse(fs.readFileSync(path.join(cacheRoot, 'result.json'), 'utf8'));
  assert(previous.localOnly && previous.database === database && previous.dbPort === dbPort && evidence.result === 'passed' && evidence.productionChanged === false, 'Only a previously passed local-only database may be copied');
  schemaCache = { root: cacheRoot, password: previous.dbPassword };
}
if (process.argv.includes('--serve') && !process.stdin.isTTY) {
  throw new Error('--serve requires an interactive terminal (tty:true) so the isolated services can be stopped safely.');
}
async function assertPortFree(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Test port ${port} is occupied; existing service untouched`)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}
await assertPortFree(dbPort);
await assertPortFree(apiPort);
assert(fs.existsSync(path.join(executableRoot, 'mariadbd.exe')), 'Local MariaDB runtime required');
fs.mkdirSync(local, { recursive: true });
const secret = schemaCache?.password || randomBytes(32).toString('hex');
const password = randomBytes(24).toString('hex');
const state = { localOnly: true, dbPort, apiPort, database, dbPassword: secret, memberPassword: password, schemaCacheSource: schemaCache ? path.basename(schemaCache.root) : null };
fs.writeFileSync(path.join(local, 'runtime.json'), JSON.stringify(state), { mode: 0o600 });
const dataDir = path.join(local, 'data');
if (schemaCache) fs.cpSync(path.join(schemaCache.root, 'data'), dataDir, { recursive: true, errorOnExist: true, force: false });
else {
  const install = spawnSync(path.join(executableRoot, 'mariadb-install-db.exe'), [`--datadir=${dataDir}`, `--port=${dbPort}`, `--password=${secret}`, '--silent'], { windowsHide: true, encoding: 'utf8' });
  assert.equal(install.status, 0, 'Isolated database initialization failed (credentials not printed)');
}
const log = fs.openSync(path.join(local, 'database.log'), 'a');
const databaseProcess = spawn(path.join(executableRoot, 'mariadbd.exe'), [`--datadir=${dataDir}`, `--port=${dbPort}`, '--bind-address=127.0.0.1', '--character-set-server=utf8mb4', '--collation-server=utf8mb4_unicode_ci'], { windowsHide: true, stdio: ['ignore', log, log] });
fs.closeSync(log);
let ds;
let app;
const passed = [];
try {
  const mysql = require('mysql2/promise');
  let connection;
  for (let i = 0; i < 40; i++) {
    try { connection = await mysql.createConnection({ host: '127.0.0.1', port: dbPort, user: 'root', password: secret }); break; }
    catch { if (databaseProcess.exitCode !== null) throw new Error('Isolated database terminated'); await new Promise(resolve => setTimeout(resolve, 250)); }
  }
  assert(connection, 'Isolated database did not become available');
  if (!schemaCache) await connection.query(`CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
  // Use a fresh cwd so repository .env files cannot activate external providers.
  process.chdir(local);
  Object.assign(process.env, { NODE_ENV: 'development', DB_HOST: '127.0.0.1', DB_PORT: String(dbPort), DB_USERNAME: 'root', DB_PASSWORD: secret, DB_DATABASE: database,
    DB_SYNCHRONIZE: 'false', JWT_SECRET: secret, USER_ACCESS_TOKEN_SECRET: secret, H5_AUTH_SECRET: secret, BUSINESS_JOB_WORKER_ENABLED: 'false',
    NOTIFICATION_SCHEDULE_WORKER_ENABLED: 'false', SMS_PROVIDER_ENABLED: 'false', WECHAT_MESSAGE_PROVIDER_ENABLED: 'false', REAL_PAYMENT_ENABLED: 'false',
    WECHAT_PAY_ENABLED: 'false', ALIPAY_PAY_ENABLED: 'false', WECHAT_LOGIN_REAL_ENABLED: 'false', API_PORT: String(apiPort),
    PRIVATE_DATA_DIR: path.join(local, 'private-data'), CONFIG_ENCRYPTION_KEY: secret, CONFIG_ENCRYPTION_LEGACY_KEY: '' });
  const { WORKER_DISABLED_SCHEDULE_FLAGS } = require(path.join(root, 'apps/api/dist/worker-config.js'));
  for (const key of WORKER_DISABLED_SCHEDULE_FLAGS) process.env[key] = key.includes('INTERVAL_MINUTES') ? '0' : 'false';
  ds = require(path.join(root, 'apps/api/dist/data-source.js')).default;
  await ds.initialize();
  // Accepted schema copies model upgrades through migrations, never destructive synchronization.
  if (!schemaCache) {
    if (process.argv.includes('--capture-empty-schema')) {
      assert(!freshMigrations, 'Schema capture is separate from fresh-migration acceptance');
      const schema = await ds.driver.createSchemaBuilder().log();
      assert(schema.upQueries.length > 0, 'Empty schema capture must contain create queries');
      assert(schema.upQueries.every(query => /^(CREATE TABLE|ALTER TABLE .+ ADD)/.test(query.query)), 'Bootstrap capture must contain only create/add statements');
      fs.writeFileSync(path.join(local, 'schema-queries.json'), JSON.stringify(schema.upQueries.map(query => query.query), null, 2));
    }
    if (freshMigrations) {
      const applied = await ds.runMigrations({ transaction: 'each' });
      assert(applied.length > 0, 'Empty database must apply the release migrations');
      assert.equal(await ds.showMigrations(), false, 'All migrations must be recorded after fresh installation');
      passed.push(`Fresh empty database applied ${applied.length} release migrations with synchronize disabled`);
    } else await ds.synchronize();
  }
  if (schemaCache) {
    const beforeSchema = await ds.query('SHOW CREATE TABLE users');
    const beforeCount = await ds.getRepository('User').count();
    const { InitialApplicationSchema1780480000000 } = require(path.join(root, 'apps/api/dist/migrations/1780480000000-InitialApplicationSchema.js'));
    const baselineRunner = ds.createQueryRunner();
    await new InitialApplicationSchema1780480000000().up(baselineRunner);
    await baselineRunner.release();
    assert.deepEqual(await ds.query('SHOW CREATE TABLE users'), beforeSchema, 'Initial migration must not rewrite an existing deployment schema');
    assert.equal(await ds.getRepository('User').count(), beforeCount, 'Initial migration must not rewrite existing account records');
    passed.push('Initial schema migration leaves an existing application database structure and account records unchanged');
  }
  const runner = ds.createQueryRunner();
  const { MemberNotificationReadState1788653700000 } = require(path.join(root, 'apps/api/dist/migrations/1788653700000-MemberNotificationReadState.js'));
  const { MemberHostApplicationOwnership1788653800000 } = require(path.join(root, 'apps/api/dist/migrations/1788653800000-MemberHostApplicationOwnership.js'));
  const { SlowExperienceRecords1788653900000 } = require(path.join(root, 'apps/api/dist/migrations/1788653900000-SlowExperienceRecords.js'));
  const memberMigrations = [new MemberNotificationReadState1788653700000(), new MemberHostApplicationOwnership1788653800000()];
  const migrations = [...memberMigrations, new SlowExperienceRecords1788653900000()];
  for (const migration of migrations) {
    await migration.down(runner);
    await migration.up(runner);
    await migration.up(runner);
  }
  await runner.release();
  passed.push(`Real MariaDB migration up/down/repeated-up in ${schemaCache ? 'a new isolated copy of a previously accepted test database (upgrade scenario)' : 'a newly created isolated database'}`);
  console.log('Local MariaDB schema and initial migration checks passed.');
  const tenants = ds.getRepository('Tenant');
  const tenant = await tenants.save(tenants.create({ code: `manpi-test-a-${runNamespace}`, name: 'Local acceptance A', region: 'Local test', enabled: true, settings: {} }));
  const other = await tenants.save(tenants.create({ code: `manpi-test-b-${runNamespace}`, name: 'Local acceptance B', region: 'Local test', enabled: true, settings: {} }));
  const members = ds.getRepository('User');
  const hash = await require('bcryptjs').hash(password, 10);
  async function fixtureMember(label) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const phone = `199${String(randomBytes(4).readUInt32BE() % 100000000).padStart(8, '0')}`;
      if (await members.findOne({ where: { phone } })) continue;
      return members.save(members.create({ phone, nickname: `Local acceptance member ${label}`, passwordHash: hash, sourceChannel: 'local_test' }));
    }
    throw new Error('Unable to allocate an isolated fixture identifier');
  }
  const user = await fixtureMember('A');
  const otherUser = await fixtureMember('B');
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require(path.join(root, 'apps/api/dist/modules/app.module.js'));
  app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new (require(path.join(root, 'apps/api/dist/shared/api-exception.filter.js')).ApiExceptionFilter)());
  app.useGlobalInterceptors(new (require(path.join(root, 'apps/api/dist/shared/api-response.interceptor.js')).ApiResponseInterceptor)());
  await app.listen(apiPort, '127.0.0.1');
  async function http(route, token, method = 'GET', payload, scope = tenant.code) {
    if (payload?.businessKey) payload = { ...payload, businessKey: `${runNamespace}:${payload.businessKey}` };
    const response = await fetch(`http://127.0.0.1:${apiPort}/api${route}${route.includes('?') ? '&' : '?'}tenantCode=${scope}`, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: payload === undefined ? undefined : JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    return { status: response.status, data: body.data, message: body.message, cacheControl: response.headers.get('cache-control') };
  }
  const login = await http('/public/auth/password-login', null, 'POST', { phone: user.phone, password });
  assert.equal(login.status, 201, login.message);
  const token = login.data.userAccessToken;
  const loginB = await http('/public/auth/password-login', null, 'POST', { phone: otherUser.phone, password });
  assert.equal(loginB.status, 201, loginB.message);
  const tokenB = loginB.data.userAccessToken;
  assert.equal((await http('/public/me/host-application')).status, 401);
  const initial = await http('/public/me/host-application', token);
  assert.equal(initial.status, 200, initial.message);
  assert.equal(initial.data.application, null);
  assert.equal(initial.data.canAccessWorkspace, false);
  assert.match(initial.cacheControl, /no-store/);
  const payload = { businessKey: 'local-host-acceptance-1', kind: 'partner', source: 'host_apply', name: 'Local test applicant', phone: user.phone, city: 'Local test', wechat: 'local-test-only', expertise: 'Activity facilitation', experience: 'Isolated acceptance fixture, not real business data.' };
  assert.equal((await http('/public/ambassador/applications', null, 'POST', payload)).status, 401);
  const submitted = await http('/public/ambassador/applications', token, 'POST', payload);
  assert.equal(submitted.status, 201, submitted.message);
  assert.equal(submitted.data.status, 'pending');
  const replay = await http('/public/ambassador/applications', token, 'POST', payload);
  assert.equal(replay.data.id, submitted.data.id);
  assert.equal((await http('/public/ambassador/applications', tokenB, 'POST', payload)).status, 400);
  assert.equal((await http('/public/ambassador/applications', token, 'POST', payload, other.code)).status, 400);
  assert.equal((await http('/public/me/host-application', tokenB)).data.application, null);
  assert.equal((await http('/public/me/host-application', token, 'GET', undefined, other.code)).data.application, null);
  passed.push('Password login, authenticated host submission, replay, owner and tenant isolation');
  const concurrent = await Promise.all([1, 2].map(index => http('/public/ambassador/applications', tokenB, 'POST', { ...payload, phone: otherUser.phone, businessKey: `local-host-concurrent-${index}` })));
  assert.deepEqual(concurrent.map(result => result.status).sort(), [201, 400], 'Concurrent different business keys must not create multiple active applications');
  passed.push('Concurrent host submissions with distinct business keys create only one active application');
  console.log('Authenticated submission, isolation and concurrency checks passed.');
  const applications = ds.getRepository('AmbassadorApplication');
  const admins = ds.getRepository('AdminUser');
  const reviewer = await admins.save(admins.create({ username: `local_acceptance_reviewer_${runNamespace}`, passwordHash: hash, role: 'super_admin', enabled: true, tenant: null }));
  const { AdminService } = require(path.join(root, 'apps/api/dist/modules/admin/admin.service.js'));
  const adminService = app.get(AdminService);
  const actor = { id: reviewer.id, username: reviewer.username, role: 'super_admin', tenantId: null };
  const reviewerLogin = await http('/admin/auth/login', null, 'POST', { username: reviewer.username, password });
  assert.equal(reviewerLogin.status, 201, reviewerLogin.message);
  const reviewerToken = reviewerLogin.data.token;
  assert([401, 403].includes((await http('/admin/slow-experiences', tokenB)).status), 'Member credentials must not authorize admin moderation');
  const noteDraft = { discovery: 'A quiet corner on the street', lightNote: 'Gentle afternoon light', feeling: 'Feeling rested after the walk', visibility: 'private', businessKey: 'local-slow-note-one' };
  assert.equal((await http('/public/me/slow-experiences')).status, 401);
  const savedNote = await http('/public/me/slow-experiences', token, 'POST', noteDraft);
  assert.equal(savedNote.status, 201, savedNote.message);
  const noteId = savedNote.data.id;
  assert.equal((await http(`/public/me/slow-experiences/${noteId}`, token)).data.id, noteId);
  assert.equal((await http(`/public/me/slow-experiences/${noteId}`, tokenB)).status, 404);
  assert.equal((await http(`/public/slow-experiences/${noteId}`)).status, 404);
  assert.equal((await http('/public/me/slow-experiences', token, 'POST', noteDraft)).data.id, noteId);
  assert.equal((await http('/public/me/slow-experiences', tokenB)).data.length, 0);
  assert.equal((await http('/public/me/slow-experiences', token, 'GET', undefined, other.code)).data.length, 0);
  assert.equal((await http(`/public/me/slow-experiences/${noteId}`, tokenB, 'PATCH', noteDraft)).status, 404);
  assert.equal((await http('/public/slow-experiences', token)).data.length, 0);
  const photoBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN4sAAAAASUVORK5CYII=', 'base64');
  const photoForm = new FormData();
  photoForm.append('file', new Blob([photoBytes], { type: 'image/png' }), 'local-photo.png');
  const uploadResponse = await fetch(`http://127.0.0.1:${apiPort}/api/public/me/slow-experiences/${noteId}/photo?tenantCode=${tenant.code}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: photoForm });
  const uploadResult = await uploadResponse.json();
  assert.equal(uploadResponse.status, 201, uploadResult.message);
  const ownerPhotoUrl = uploadResult.data.photoUrl;
  const photoResponse = await fetch(`http://127.0.0.1:${apiPort}${ownerPhotoUrl}`);
  assert.equal(photoResponse.status, 200);
  assert.equal(photoResponse.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await photoResponse.arrayBuffer()), photoBytes);
  const storedPhotoRecord = await ds.getRepository('SlowExperienceRecord').findOne({ where: { id: noteId } });
  const ciphertext = fs.readFileSync(path.join(local, 'private-data', 'slow-experience', storedPhotoRecord.photoReference.split('/').pop()));
  assert(!ciphertext.equals(photoBytes), 'Private photograph must be encrypted on disk');
  const requestedNote = await http(`/public/me/slow-experiences/${noteId}`, token, 'PATCH', { ...noteDraft, visibility: 'public_review' });
  assert.equal(requestedNote.status, 200, requestedNote.message);
  assert.equal(requestedNote.data.moderationStatus, 'pending');
  const moderationList = await http('/admin/slow-experiences', reviewerToken);
  assert.equal(moderationList.status, 200, moderationList.message);
  assert.equal(moderationList.data[0].id, noteId);
  assert.equal((await http(`/admin/slow-experiences/${noteId}/review`, reviewerToken, 'PATCH', { status: 'approved', revision: requestedNote.data.revision - 1 })).status, 409);
  const reviewedNote = await http(`/admin/slow-experiences/${noteId}/review`, reviewerToken, 'PATCH', { status: 'approved', revision: requestedNote.data.revision });
  assert.equal(reviewedNote.status, 200, reviewedNote.message);
  const publicNotes = await http('/public/slow-experiences', token);
  assert.equal(publicNotes.data.length, 1);
  const publicPhotoUrl = publicNotes.data[0].photoUrl;
  assert.equal((await fetch(`http://127.0.0.1:${apiPort}${publicPhotoUrl}`)).status, 200);
  const publicDetail = await http(`/public/slow-experiences/${noteId}`);
  assert.equal(publicDetail.status, 200);
  assert.equal(publicDetail.cacheControl, 'no-store');
  assert.equal((await http(`/public/slow-experiences/${noteId}`, null, 'GET', undefined, other.code)).status, 404);
  assert.equal((await http(`/public/me/slow-experiences/${noteId}`, token, 'PATCH', { ...noteDraft, revision: requestedNote.data.revision - 1 })).status, 409);
  const editForm = new FormData();
  for (const [key, value] of Object.entries({ discovery: 'A changed street detail', lightNote: '', feeling: noteDraft.feeling, visibility: 'public_review', revision: String(requestedNote.data.revision) })) editForm.append(key, value);
  editForm.append('file', new Blob([photoBytes], { type: 'image/png' }), 'replacement.png');
  const editResponse = await fetch(`http://127.0.0.1:${apiPort}/api/public/me/slow-experiences/${noteId}/edit?tenantCode=${tenant.code}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: editForm });
  const editResult = await editResponse.json();
  assert.equal(editResponse.status, 201, editResult.message);
  assert.equal(editResult.data.discovery, 'A changed street detail');
  assert.equal(editResult.data.moderationStatus, 'pending');
  assert.equal((await http(`/public/slow-experiences/${noteId}`)).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:${apiPort}${publicPhotoUrl}`)).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:${apiPort}${ownerPhotoUrl}`)).status, 404);
  const retainedPhoto = editResult.data.photoUrl;
  assert.equal((await http(`/public/me/slow-experiences/${noteId}`, token, 'PATCH', { discovery: editResult.data.discovery, lightNote: '', feeling: noteDraft.feeling, visibility: 'private', revision: editResult.data.revision, removePhoto: true })).status, 400);
  assert.equal((await fetch(`http://127.0.0.1:${apiPort}${retainedPhoto}`)).status, 200, 'Invalid photo removal must retain the previous photo');
  assert.equal((await http(`/admin/slow-experiences/${noteId}/review`, reviewerToken, 'PATCH', { status: 'approved', revision: editResult.data.revision })).status, 200);
  const revokedNote = await http(`/public/me/slow-experiences/${noteId}`, token, 'PATCH', noteDraft);
  assert.equal(revokedNote.status, 200);
  assert.equal((await fetch(`http://127.0.0.1:${apiPort}${publicPhotoUrl}`)).status, 404);
  assert.equal((await http('/public/slow-experiences', token)).data.length, 0);
  assert.equal((await http(`/public/me/slow-experiences/${noteId}`, token, 'DELETE')).status, 200);
  assert.equal((await fetch(`http://127.0.0.1:${apiPort}${ownerPhotoUrl}`)).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:${apiPort}${retainedPhoto}`)).status, 404);
  assert.equal((await http('/public/me/slow-experiences', token)).data.length, 0);
  const concurrentNotes = await Promise.all([1, 2].map(() => http('/public/me/slow-experiences', token, 'POST', { ...noteDraft, businessKey: 'local-slow-concurrent' })));
  assert(concurrentNotes.every(result => result.status === 201));
  assert.equal(concurrentNotes[0].data.id, concurrentNotes[1].data.id);
  assert.equal(await ds.getRepository('SlowExperienceRecord').count({ where: { businessKey: `${runNamespace}:local-slow-concurrent` } }), 1);
  const recordMigration = new SlowExperienceRecords1788653900000();
  const recordRunner = ds.createQueryRunner();
  await recordMigration.up(recordRunner);
  await recordMigration.up(recordRunner);
  await recordRunner.release();
  assert.equal(await ds.getRepository('SlowExperienceRecord').count({ where: { businessKey: `${runNamespace}:local-slow-concurrent` } }), 1);
  await http(`/public/me/slow-experiences/${concurrentNotes[0].data.id}`, token, 'DELETE');
  passed.push('Authenticated slow-note save/replay, owner/tenant isolation, encrypted photo upload/read, moderation, private reversal and deletion revoke photo access');
  passed.push('Owner/public details, stale-author edit rejection, atomic text/photo editing, re-review and invalid photo removal rollback');
  const keywordRules = ds.getRepository('ContentKeywordRule');
  const sanctions = ds.getRepository('ContentUserSanction');
  const guardedWord = `blocked-${runNamespace}`;
  const rule = await keywordRules.save(keywordRules.create({ tenant: null, scope: 'community', keyword: guardedWord, matchMode: 'contains', action: 'reject', enabled: true }));
  const guardedDraft = { ...noteDraft, discovery: `Observed ${guardedWord} today`, businessKey: 'governance-private' };
  const governedNote = await http('/public/me/slow-experiences', token, 'POST', guardedDraft);
  assert.equal(governedNote.status, 201, 'Private writing is not rewritten by publication rules');
  assert.equal(governedNote.data.discovery, guardedDraft.discovery);
  assert.equal((await http(`/public/me/slow-experiences/${governedNote.data.id}`, token, 'PATCH', { ...guardedDraft, visibility: 'public_review' })).status, 400);
  assert.equal((await http(`/public/me/slow-experiences/${governedNote.data.id}`, token)).data.visibility, 'private');
  await keywordRules.update(rule.id, { tenant: other });
  const pendingGoverned = await http(`/public/me/slow-experiences/${governedNote.data.id}`, token, 'PATCH', { ...guardedDraft, visibility: 'public_review' });
  assert.equal(pendingGoverned.status, 200, 'Another tenant rule must not affect this tenant');
  await keywordRules.update(rule.id, { tenant });
  assert.equal((await http(`/admin/slow-experiences/${governedNote.data.id}/review`, reviewerToken, 'PATCH', { status: 'approved', revision: pendingGoverned.data.revision })).status, 400);
  await keywordRules.update(rule.id, { action: 'mask', replacement: 'a quiet place' });
  assert.equal((await http(`/admin/slow-experiences/${governedNote.data.id}/review`, reviewerToken, 'PATCH', { status: 'approved', revision: pendingGoverned.data.revision })).status, 409, 'New masking rules must not silently change reviewed content');
  const masked = await http(`/public/me/slow-experiences/${governedNote.data.id}`, token, 'PATCH', { ...guardedDraft, visibility: 'public_review', revision: pendingGoverned.data.revision });
  assert.equal(masked.status, 200);
  assert.equal(masked.data.discovery, 'Observed a quiet place today');
  const sanction = await sanctions.save(sanctions.create({ tenant, userId: user.id, scope: 'community', type: 'mute', status: 'active', reason: 'Isolated publication policy test', startsAt: new Date(Date.now() - 1000), endsAt: null }));
  assert.equal((await http(`/admin/slow-experiences/${governedNote.data.id}/review`, reviewerToken, 'PATCH', { status: 'approved', revision: masked.data.revision })).status, 403);
  assert.equal((await http(`/public/me/slow-experiences/${governedNote.data.id}`, token, 'PATCH', { ...guardedDraft, visibility: 'public_review', revision: masked.data.revision })).status, 403);
  assert.equal((await http(`/public/me/slow-experiences/${governedNote.data.id}`, token, 'PATCH', { ...guardedDraft, visibility: 'private', revision: masked.data.revision })).status, 200, 'Sanctions must not prevent privacy reversal');
  assert.equal((await http(`/public/me/slow-experiences/${governedNote.data.id}`, token, 'DELETE')).status, 200);
  await sanctions.delete(sanction.id);
  await keywordRules.delete(rule.id);
  passed.push('Global/current-tenant public keyword rules, masking, changed-policy approval rejection, sanction enforcement and private reversal/delete remain available');
  const pendingHost = concurrent.find(result => result.status === 201);
  await adminService.updateAmbassadorApplication(pendingHost.data.id, { status: 'rejected' }, actor);
  const oldReplay = await http('/public/ambassador/applications', tokenB, 'POST', { ...payload, phone: otherUser.phone, businessKey: pendingHost.data.id === concurrent[0].data?.id ? 'local-host-concurrent-1' : 'local-host-concurrent-2' });
  assert.equal(oldReplay.data.status, 'rejected', 'Old submission keys replay the original rejected record');
  const reapplied = await http('/public/ambassador/applications', tokenB, 'POST', { ...payload, phone: otherUser.phone, businessKey: 'local-host-reapplication' });
  assert.equal(reapplied.status, 201);
  assert.notEqual(reapplied.data.id, pendingHost.data.id);
  assert.equal((await http('/public/me/host-application', tokenB)).data.application.id, reapplied.data.id);
  passed.push('Rejected application replays old key and creates a new pending application with a fresh key');
  const volunteerBefore = await ds.getRepository('VolunteerProfile').count();
  for (const status of ['contacted', 'screened', 'approved']) await adminService.updateAmbassadorApplication(submitted.data.id, { status }, actor);
  const reviewed = (await http('/public/me/host-application', token)).data;
  assert.equal(reviewed.application.status, 'approved');
  assert.equal(reviewed.canAccessWorkspace, false);
  assert.equal(await ds.getRepository('VolunteerProfile').count(), volunteerBefore);
  const workspace = await admins.save(admins.create({ username: user.phone, passwordHash: hash, role: 'operator', enabled: true, tenant }));
  assert.equal((await http('/public/me/host-application', token)).data.canAccessWorkspace, true);
  assert.equal((await http('/public/me/host-application', token, 'GET', undefined, other.code)).data.canAccessWorkspace, false);
  await admins.update(workspace.id, { enabled: false });
  assert.equal((await http('/public/me/host-application', token)).data.canAccessWorkspace, false);
  passed.push('Review writeback, no volunteer conversion, independent workspace permission and revocation');
  const notifications = ds.getRepository('Notification');
  const notification = await notifications.save(notifications.create({ user, tenant, tenantScopeKey: `tenant:${tenant.id}`, channel: 'site', status: 'sent', scene: 'activityReminder', title: 'Local acceptance reminder', content: 'Only for isolated testing.', readAt: null }));
  await notifications.save(notifications.create({ user: otherUser, tenant, tenantScopeKey: `tenant:${tenant.id}`, channel: 'site', status: 'sent', title: 'Other owner', content: 'Not visible.' }));
  await notifications.save(notifications.create({ user, tenant: other, tenantScopeKey: `tenant:${other.id}`, channel: 'site', status: 'sent', title: 'Other tenant', content: 'Not visible.' }));
  await notifications.save(notifications.create({ user, tenant, tenantScopeKey: `tenant:${tenant.id}`, channel: 'sms', status: 'sent', title: 'SMS audit', content: 'Never sent, database fixture only.' }));
  assert.equal((await http('/public/me/notifications')).status, 401);
  const inbox = await http('/public/me/notifications', token);
  assert.equal(inbox.status, 200, inbox.message);
  assert.equal(inbox.data.length, 1);
  assert.equal(inbox.data[0].id, notification.id);
  assert.equal((await http(`/public/me/notifications/${notification.id}/read`, tokenB, 'POST')).status, 404);
  assert.equal((await http(`/public/me/notifications/${notification.id}/read`, token, 'POST', undefined, other.code)).status, 404);
  const read = await http(`/public/me/notifications/${notification.id}/read`, token, 'POST');
  assert.equal(read.status, 201, read.message);
  assert(read.data.readAt);
  const reread = await http(`/public/me/notifications/${notification.id}/read`, token, 'POST');
  assert.equal(reread.data.readAt, read.data.readAt);
  assert.equal((await http('/public/me/notifications', token)).data[0].readAt, read.data.readAt);
  passed.push('Delivered-site inbox isolation, ownership-safe read, persisted idempotent timestamp');
  if (process.argv.includes('--activity-flow')) passed.push(...await acceptManpiActivityFlow({ ds, http, tenant, other, user, token, tokenB, reviewerToken, passwordHash: hash, password, runNamespace }));
  for (const migration of memberMigrations) { const q = ds.createQueryRunner(); await migration.down(q); await migration.up(q); await q.release(); }
  assert.equal(await applications.count({ where: { id: submitted.data.id } }), 1);
  assert.equal(await notifications.count({ where: { id: notification.id } }), 1);
  passed.push('Rollback/reapply leaves application and notification records intact (new fields reset as expected)');
  const evidence = { result: 'passed', localOnly: true, productionChanged: false, externalProvidersEnabled: false, passed, createdAt: new Date().toISOString() };
  fs.writeFileSync(path.join(local, 'result.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ...evidence, evidencePath: path.join(local, 'result.json') }, null, 2));
  if (process.argv.includes('--serve')) {
    Object.assign(state, { memberPhone: user.phone, otherMemberPhone: otherUser.phone, tenantCode: tenant.code, otherTenantCode: other.code, reviewerUsername: reviewer.username });
    fs.writeFileSync(path.join(local, 'runtime.json'), JSON.stringify(state), { mode: 0o600 });
    await applications.update(submitted.data.id, { applicantUserId: user.id, applicantTenantScopeKey: `tenant:${tenant.id}` });
    await applications.update(reapplied.data.id, { applicantUserId: otherUser.id, applicantTenantScopeKey: `tenant:${tenant.id}` });
    const announcements = ds.getRepository('Announcement');
    await announcements.save(announcements.create({ tenant, title: '本地验收公告', content: '仅用于隔离环境页面验证，不代表正式平台通知。', enabled: true, type: 'notice', audience: null }));
    console.log(`Isolated acceptance API listening on http://127.0.0.1:${apiPort}/api; send stop on stdin when browser verification is finished.`);
    await new Promise(resolve => {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', text => { if (String(text).trim() === 'stop') { process.stdin.pause(); resolve(); } });
      process.stdin.resume();
    });
  }
} finally {
  if (app) await app.close();
  if (ds?.isInitialized) await ds.destroy();
  databaseProcess.kill();
}
