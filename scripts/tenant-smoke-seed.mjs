import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const bcrypt = apiRequire("bcryptjs");
const mysql = apiRequire("mysql2/promise");

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

const envFile = process.env.ENV_FILE || (fs.existsSync(path.join(root, "deploy/.env.production")) ? "deploy/.env.production" : "apps/api/.env");
const env = { ...readEnv(path.join(root, envFile)), ...process.env };

const tenantA = tenantConfig("A");
const tenantB = tenantConfig("B");

function requiredEnv(key) {
  const value = env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function tenantConfig(suffix) {
  return {
    code: requiredEnv(`TENANT_${suffix}_CODE`),
    name: env[`TENANT_${suffix}_NAME`] || `Smoke Tenant ${suffix}`,
    region: env[`TENANT_${suffix}_REGION`] || null,
    username: requiredEnv(`TENANT_${suffix}_ADMIN`),
    password: requiredEnv(`TENANT_${suffix}_PASSWORD`),
    financeUsername: env[`TENANT_${suffix}_FINANCE_ADMIN`] || `${requiredEnv(`TENANT_${suffix}_ADMIN`)}_finance`,
    financePassword: env[`TENANT_${suffix}_FINANCE_PASSWORD`] || requiredEnv(`TENANT_${suffix}_PASSWORD`),
    agentName: env[`TENANT_${suffix}_AGENT_NAME`] || `Smoke Tenant ${suffix} Agent`,
    domain: env[`TENANT_${suffix}_DOMAIN`] || null,
    h5Domain: env[`TENANT_${suffix}_H5_DOMAIN`] || null
  };
}

async function main() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USERNAME || "activity",
    password: env.DB_PASSWORD || "activitypass",
    database: env.DB_DATABASE || "activity_registration",
    timezone: "+08:00",
    multipleStatements: false
  });

  try {
    await ensureTenantSmokeSchema(connection);
    await upsertTenantWithAdmin(connection, tenantA);
    await upsertTenantWithAdmin(connection, tenantB);
    console.log("Tenant smoke seed completed.");
    console.log(`Tenant A: ${tenantA.code} / ${tenantA.username} / finance ${tenantA.financeUsername}`);
    console.log(`Tenant B: ${tenantB.code} / ${tenantB.username} / finance ${tenantB.financeUsername}`);
    console.log("Next: npm run smoke:tenant");
  } finally {
    await connection.end();
  }
}

async function ensureTenantSmokeSchema(connection) {
  const requiredTables = ["tenants", "admin_users"];
  for (const table of requiredTables) {
    const [rows] = await connection.query("SHOW TABLES LIKE ?", [table]);
    if (!rows.length) throw new Error(`Required table missing: ${table}. Run migrations first.`);
  }
  for (const [table, column] of [
    ["admin_users", "tenantId"],
    ["activities", "tenantId"],
    ["orders", "tenantId"],
    ["agents", "tenantId"],
    ["agent_payment_accounts", "tenantId"],
    ["agent_settlements", "tenantId"],
    ["homepage_sections", "tenantId"],
    ["announcements", "tenantId"],
    ["operation_settings", "tenantId"]
  ]) {
    const [rows] = await connection.query("SHOW COLUMNS FROM ?? LIKE ?", [table, column]);
    if (!rows.length) throw new Error(`Required tenant column missing: ${table}.${column}. Run tenant migrations first.`);
  }
}

async function upsertTenantWithAdmin(connection, tenant) {
  const settings = {};
  if (tenant.domain) settings.domain = tenant.domain;
  if (tenant.h5Domain) settings.h5Domain = tenant.h5Domain;
  await connection.execute(
    `
      INSERT INTO tenants (code, name, region, enabled, settings, createdAt, updatedAt)
      VALUES (?, ?, ?, true, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        region = VALUES(region),
        enabled = true,
        settings = VALUES(settings),
        updatedAt = NOW()
    `,
    [tenant.code, tenant.name, tenant.region, Object.keys(settings).length ? JSON.stringify(settings) : null]
  );
  const [rows] = await connection.execute("SELECT id FROM tenants WHERE code = ? LIMIT 1", [tenant.code]);
  const tenantId = rows[0]?.id;
  if (!tenantId) throw new Error(`Could not resolve tenant id for ${tenant.code}`);

  const passwordHash = await bcrypt.hash(tenant.password, 10);
  const financePasswordHash = await bcrypt.hash(tenant.financePassword, 10);
  await connection.execute(
    `
      INSERT INTO admin_users (username, passwordHash, role, tenantId, enabled, createdAt, updatedAt)
      VALUES (?, ?, 'operator', ?, true, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        passwordHash = VALUES(passwordHash),
        role = 'operator',
        tenantId = VALUES(tenantId),
        enabled = true,
        updatedAt = NOW()
    `,
    [tenant.username, passwordHash, tenantId]
  );
  await connection.execute(
    `
      INSERT INTO admin_users (username, passwordHash, role, tenantId, enabled, createdAt, updatedAt)
      VALUES (?, ?, 'finance', ?, true, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        passwordHash = VALUES(passwordHash),
        role = 'finance',
        tenantId = VALUES(tenantId),
        enabled = true,
        updatedAt = NOW()
    `,
    [tenant.financeUsername, financePasswordHash, tenantId]
  );
  await upsertTenantAgent(connection, tenant, tenantId);
}

async function upsertTenantAgent(connection, tenant, tenantId) {
  const [agentRows] = await connection.execute("SELECT id FROM agents WHERE tenantId = ? AND name = ? LIMIT 1", [tenantId, tenant.agentName]);
  let agentId = agentRows[0]?.id;
  const settlementConfig = JSON.stringify({ commissionRate: 0 });
  if (agentId) {
    await connection.execute(
      `
        UPDATE agents
        SET region = ?, contactName = ?, contactPhone = ?, enabled = true, settlementConfig = ?, updatedAt = NOW()
        WHERE id = ?
      `,
      [tenant.region, "Tenant Smoke", "13800000000", settlementConfig, agentId]
    );
  } else {
    const [result] = await connection.execute(
      `
        INSERT INTO agents (name, tenantId, region, contactName, contactPhone, enabled, settlementConfig, createdAt, updatedAt)
        VALUES (?, ?, ?, 'Tenant Smoke', '13800000000', true, ?, NOW(), NOW())
      `,
      [tenant.agentName, tenantId, tenant.region, settlementConfig]
    );
    agentId = result.insertId;
  }

  const accountConfig = JSON.stringify({
    WECHAT_TRANSFER_OPENID: `tenant-smoke-openid-${tenant.code}`,
    WECHAT_TRANSFER_REAL_NAME: tenant.agentName,
    ALIPAY_PAYEE_ACCOUNT: `${tenant.code}@tenant-smoke.local`,
    ALIPAY_PAYEE_REAL_NAME: tenant.agentName
  });
  const [accountRows] = await connection.execute("SELECT id FROM agent_payment_accounts WHERE agentId = ? AND provider = 'wechat' LIMIT 1", [agentId]);
  if (accountRows[0]?.id) {
    await connection.execute(
      `
        UPDATE agent_payment_accounts
        SET tenantId = ?, merchantName = ?, merchantNo = ?, enabled = true, config = ?, updatedAt = NOW()
        WHERE id = ?
      `,
      [tenantId, `${tenant.agentName} WeChat`, `TENANT_SMOKE_${tenant.code}`, accountConfig, accountRows[0].id]
    );
  } else {
    await connection.execute(
      `
        INSERT INTO agent_payment_accounts (agentId, tenantId, provider, merchantName, merchantNo, enabled, config, createdAt, updatedAt)
        VALUES (?, ?, 'wechat', ?, ?, true, ?, NOW(), NOW())
      `,
      [agentId, tenantId, `${tenant.agentName} WeChat`, `TENANT_SMOKE_${tenant.code}`, accountConfig]
    );
  }
}

main().catch((error) => {
  console.error(`Tenant smoke seed failed: ${error.message}`);
  process.exitCode = 1;
});
