import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('apps/api/package.json'));
const statePath = '.local-logs/operations-20260905/runtime.json';
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '13316', DB_USERNAME: 'root', DB_PASSWORD: state.dbPassword, DB_DATABASE: 'activity_operations' });
const ds = require(path.resolve('apps/api/dist/data-source.js')).default;
await ds.initialize();
try {
  const tenant = await ds.getRepository('Tenant').findOneByOrFail({ code: 'qiwai-showcase' });
  const repo = ds.getRepository('AdminUser');
  if (!state.roleAcceptanceAccounts) {
    const suffix = String(Date.now());
    const passwordHash = await require('bcryptjs').hash(state.adminPassword, 10);
    state.roleAcceptanceAccounts = [];
    for (const [key, role] of [['tenant_admin', 'super_admin'], ['operator', 'operator'], ['finance', 'finance'], ['checkin', 'checkin_staff']]) {
      const account = await repo.save(repo.create({ username: `local_${key}_${suffix}`, role, tenant, permissions: null, enabled: true, passwordHash, dataScope: { type: 'all' } }));
      state.roleAcceptanceAccounts.push({ id: account.id, username: account.username, role, tenantId: tenant.id });
    }
    fs.writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
  }
  for (const account of state.roleAcceptanceAccounts) {
    const existing = await repo.findOneByOrFail({ id: account.id, username: account.username });
    if (!existing.enabled || existing.tenant?.id !== tenant.id) throw new Error('Existing test account changed; no credentials or permissions overwritten.');
  }
  console.log(JSON.stringify({ localOnly: true, platformAdmin: state.adminUsername, tenantCode: tenant.code, admins: state.roleAcceptanceAccounts, members: (state.socialTestAccounts || []).slice(0, 2).map(row => ({ id: row.id, label: row.label })), passwordLocation: statePath }, null, 2));
} finally { await ds.destroy(); }
