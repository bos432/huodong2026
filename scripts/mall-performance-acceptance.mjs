import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";

const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const API_BASE = (process.env.API_BASE || "http://127.0.0.1:18080/api").replace(/\/$/, "");
const TENANT_CODE = process.env.PERF_TENANT_CODE || "qiwai-showcase";
const USER_PASSWORD = process.env.PERF_USER_PASSWORD || "Qiwai123456";
const SINGLE_ORDERS = numberEnv("PERF_MALL_SINGLE_ORDERS", 100);
const CROSS_GROUPS = numberEnv("PERF_MALL_CROSS_GROUPS", 50);
const runId = Date.now();
const thresholds = {
  quoteP95Ms: numberEnv("PERF_MALL_QUOTE_P95_MS", 3_000),
  singleOrderP95Ms: numberEnv("PERF_MALL_SINGLE_P95_MS", 15_000),
  singleOrderTotalMs: numberEnv("PERF_MALL_SINGLE_TOTAL_MS", 20_000),
  crossGroupP95Ms: numberEnv("PERF_MALL_CROSS_P95_MS", 20_000),
  crossGroupTotalMs: numberEnv("PERF_MALL_CROSS_TOTAL_MS", 30_000)
};

function numberEnv(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
  return Math.trunc(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function percentile(values, point) {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return 0;
  const index = Math.min(Math.max(Math.ceil((point / 100) * sorted.length) - 1, 0), sorted.length - 1);
  return Math.round(sorted[index] * 100) / 100;
}

function summarize(results, totalMs) {
  const successful = results.filter((item) => item.ok);
  const durations = successful.map((item) => item.durationMs);
  return {
    requests: results.length,
    succeeded: successful.length,
    failed: results.length - successful.length,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    maxMs: percentile(durations, 100),
    totalMs: Math.round(totalMs * 100) / 100,
    requestsPerSecond: totalMs > 0 ? Math.round((successful.length * 100_000) / totalMs) / 100 : 0,
    failures: results.filter((item) => !item.ok).slice(0, 5).map((item) => item.message)
  };
}

async function jsonApi(pathname, options = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok || body?.code !== 0) {
    const error = new Error(`${options.method || "GET"} ${pathname}: ${body?.message || text || response.status}`);
    error.status = response.status;
    throw error;
  }
  return body.data;
}

async function measureAll(items, action) {
  const startedAt = performance.now();
  const results = await Promise.all(items.map(async (item, index) => {
    const requestStartedAt = performance.now();
    try {
      const data = await action(item, index);
      return { ok: true, durationMs: performance.now() - requestStartedAt, data };
    } catch (error) {
      return { ok: false, durationMs: performance.now() - requestStartedAt, status: error?.status || 0, message: error instanceof Error ? error.message : String(error) };
    }
  }));
  return { results, metrics: summarize(results, performance.now() - startedAt) };
}

async function ensureMerchant(connection, tenantId, code, name) {
  const [existing] = await connection.execute("SELECT id FROM mall_merchants WHERE tenantId=? AND code=? ORDER BY id DESC LIMIT 1", [tenantId, code]);
  if (existing.length) {
    const id = Number(existing[0].id);
    await connection.execute("UPDATE mall_merchants SET status='active', mallEnabled=1, onboardingStatus='legacy_approved', contractRequired=0, paymentMode='platform_collect', updatedAt=NOW(6) WHERE id=?", [id]);
    return id;
  }
  const [result] = await connection.execute(
    "INSERT INTO mall_merchants (code,name,ownerType,tenantId,status,mallEnabled,productAuditRequired,paymentMode,onboardingStatus,contractRequired,platformCommissionBps,serviceFeeBps,settlementCycleDays,region,contactName,contactPhone,createdAt,updatedAt) VALUES (?,?, 'tenant',?,'active',1,0,'platform_collect','legacy_approved',0,0,0,30,'Performance region','Performance operator','18800000000',NOW(6),NOW(6))",
    [code, name, tenantId]
  );
  return Number(result.insertId);
}

async function ensureProductAndSku(connection, tenantId, merchantId, suffix) {
  const productCode = `PERF-PRODUCT-${suffix}`;
  const skuCode = `PERF-SKU-${suffix}`;
  const [products] = await connection.execute("SELECT id FROM mall_products WHERE merchantId=? AND productCode=? LIMIT 1", [merchantId, productCode]);
  let productId;
  if (products.length) {
    productId = Number(products[0].id);
    await connection.execute("UPDATE mall_products SET status='published', price=9.90, originalPrice=9.90, updatedAt=NOW(6) WHERE id=?", [productId]);
  } else {
    const snapshot = JSON.stringify({ title: `[PERF] Mall load product ${suffix}`, version: 1 });
    const [result] = await connection.execute(
      "INSERT INTO mall_products (tenantId,title,description,price,originalPrice,status,featured,sortOrder,merchantId,productCode,contentVersion,publishedSnapshot,createdAt,updatedAt) VALUES (?,?,?,9.90,9.90,'published',0,0,?,?,1,?,NOW(6),NOW(6))",
      [tenantId, `[PERF] Mall load product ${suffix}`, "Retained product for repeatable mall performance acceptance.", merchantId, productCode, snapshot]
    );
    productId = Number(result.insertId);
  }
  const [skus] = await connection.execute("SELECT id FROM mall_skus WHERE merchantId=? AND skuCode=? LIMIT 1", [merchantId, skuCode]);
  let skuId;
  if (skus.length) {
    skuId = Number(skus[0].id);
  } else {
    const [result] = await connection.execute(
      "INSERT INTO mall_skus (tenantId,productId,merchantId,name,skuCode,price,originalPrice,stock,lockedStock,sortOrder,enabled,attributes,weightGrams,createdAt,updatedAt) VALUES (?,?,?,'Load SKU',?,9.90,9.90,10000,0,0,1,JSON_OBJECT('purpose','performance'),100,NOW(6),NOW(6))",
      [tenantId, productId, merchantId, skuCode]
    );
    skuId = Number(result.insertId);
  }
  await connection.execute("UPDATE mall_skus SET enabled=1, stock=GREATEST(stock, lockedStock+10000), price=9.90, originalPrice=9.90, updatedAt=NOW(6) WHERE id=?", [skuId]);
  return { productId, skuId };
}

async function prepareUsers(connection, tenantId, passwordHash) {
  const requiredUsers = Math.max(SINGLE_ORDERS, CROSS_GROUPS);
  assert(requiredUsers <= 999, "mall performance fixture supports at most 999 users per run");
  const prefix = `185${String(runId).slice(-5)}`;
  const rows = Array.from({ length: requiredUsers }, (_, index) => {
    const suffix = String(index).padStart(3, "0");
    return { phone: `${prefix}${suffix}`, nickname: `Mall load member ${suffix}` };
  });
  for (const row of rows) {
    await connection.execute("INSERT INTO users (phone,nickname,passwordHash,createdAt,updatedAt) VALUES (?,?,?,NOW(6),NOW(6)) ON DUPLICATE KEY UPDATE nickname=VALUES(nickname),passwordHash=VALUES(passwordHash)", [row.phone, row.nickname, passwordHash]);
  }
  const [users] = await connection.execute("SELECT id,phone,nickname FROM users WHERE phone LIKE ? ORDER BY phone ASC", [`${prefix}%`]);
  assert(users.length === requiredUsers, `expected ${requiredUsers} mall load users, got ${users.length}`);
  for (const user of users) {
    await connection.execute(
      "INSERT INTO mall_addresses (tenantId,userId,receiverName,receiverPhone,province,city,district,detail,isDefault,createdAt,updatedAt) SELECT ?,?,?,?,?,?,?,?,1,NOW(6),NOW(6) WHERE NOT EXISTS (SELECT 1 FROM mall_addresses WHERE tenantId=? AND userId=?)",
      [tenantId, user.id, user.nickname, user.phone, "Performance province", "Performance city", "Performance district", "Performance address 1", tenantId, user.id]
    );
  }
  const [withAddresses] = await connection.execute("SELECT u.id,u.phone,u.nickname,a.id AS addressId FROM users u JOIN mall_addresses a ON a.tenantId=? AND a.userId=u.id WHERE u.phone LIKE ? ORDER BY u.phone ASC", [tenantId, `${prefix}%`]);
  assert(withAddresses.length === requiredUsers, `expected ${requiredUsers} mall load addresses, got ${withAddresses.length}`);
  return withAddresses.map((row) => ({ id: Number(row.id), phone: row.phone, nickname: row.nickname, addressId: Number(row.addressId) }));
}

async function loginUsers(users) {
  const sessions = [];
  for (let offset = 0; offset < users.length; offset += 20) {
    const batch = await Promise.all(users.slice(offset, offset + 20).map(async (user) => {
      const login = await jsonApi("/public/auth/password-login", {
        method: "POST",
        headers: { "x-tenant-code": TENANT_CODE },
        body: JSON.stringify({ phone: user.phone, password: USER_PASSWORD, nickname: user.nickname })
      });
      assert(login?.userAccessToken, `login returned no token for ${user.phone}`);
      return { ...user, token: login.userAccessToken };
    }));
    sessions.push(...batch);
  }
  return sessions;
}

function userHeaders(session) {
  return { Authorization: `Bearer ${session.token}`, "x-tenant-code": TENANT_CODE };
}

async function inventory(connection, skuIds) {
  const [rows] = await connection.query(`SELECT id,stock,lockedStock FROM mall_skus WHERE id IN (${skuIds.map(() => "?").join(",")}) ORDER BY id`, skuIds);
  return Object.fromEntries(rows.map((row) => [Number(row.id), { stock: Number(row.stock), lockedStock: Number(row.lockedStock) }]));
}

const resultDirectory = path.resolve(`.local-logs/mall-performance-acceptance-${runId}`);
const resultFile = path.join(resultDirectory, "result.json");
let connection;

try {
  connection = await mysql.createConnection({
    host: process.env.PERF_DB_HOST || "127.0.0.1",
    port: numberEnv("PERF_DB_PORT", 13306),
    user: process.env.PERF_DB_USER || "activity",
    password: process.env.PERF_DB_PASSWORD || "activitypass",
    database: process.env.PERF_DB_DATABASE || "activity_registration",
    charset: "utf8mb4"
  });
  const [tenants] = await connection.execute("SELECT id FROM tenants WHERE code=? AND enabled=1 LIMIT 1", [TENANT_CODE]);
  assert(tenants.length === 1, `enabled tenant ${TENANT_CODE} was not found`);
  const tenantId = Number(tenants[0].id);
  const merchantA = await ensureMerchant(connection, tenantId, "PERF-MERCHANT-A", "[PERF] Mall merchant A");
  const merchantB = await ensureMerchant(connection, tenantId, "PERF-MERCHANT-B", "[PERF] Mall merchant B");
  const fixtureA = await ensureProductAndSku(connection, tenantId, merchantA, "A");
  const fixtureB = await ensureProductAndSku(connection, tenantId, merchantB, "B");
  const passwordHash = await bcrypt.hash(USER_PASSWORD, 8);
  const users = await prepareUsers(connection, tenantId, passwordHash);
  const sessions = await loginUsers(users);

  const singleSessions = sessions.slice(0, SINGLE_ORDERS);
  const singleQuotes = await measureAll(singleSessions, (session) => jsonApi(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userHeaders(session),
    body: JSON.stringify({ items: [{ skuId: fixtureA.skuId, quantity: 1 }] })
  }));
  assert(singleQuotes.results.every((item) => item.ok && item.data?.quoteToken), `single-store quote failures: ${singleQuotes.metrics.failures.join(" | ")}`);
  const beforeSingle = await inventory(connection, [fixtureA.skuId, fixtureB.skuId]);
  const singleInputs = singleSessions.map((session, index) => ({
    session,
    body: {
      items: [{ skuId: fixtureA.skuId, quantity: 1 }],
      addressId: session.addressId,
      paymentMethod: "offline",
      quoteToken: singleQuotes.results[index].data.quoteToken,
      clientOrderKey: `mall-perf-single-${runId}-${index}`,
      buyerRemark: `Mall single-store performance ${runId}`
    }
  }));
  const singleOrders = await measureAll(singleInputs, ({ session, body }) => jsonApi(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userHeaders(session),
    body: JSON.stringify(body)
  }));
  const afterSingle = await inventory(connection, [fixtureA.skuId, fixtureB.skuId]);

  const crossSessions = sessions.slice(0, CROSS_GROUPS);
  const crossQuotes = await measureAll(crossSessions, (session) => jsonApi(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userHeaders(session),
    body: JSON.stringify({ items: [{ skuId: fixtureA.skuId, quantity: 1 }, { skuId: fixtureB.skuId, quantity: 1 }] })
  }));
  assert(crossQuotes.results.every((item) => item.ok && item.data?.quoteToken && item.data?.allocations?.length === 2), `cross-store quote failures: ${crossQuotes.metrics.failures.join(" | ")}`);
  const beforeCross = await inventory(connection, [fixtureA.skuId, fixtureB.skuId]);
  const crossInputs = crossSessions.map((session, index) => ({
    session,
    body: {
      items: [{ skuId: fixtureA.skuId, quantity: 1 }, { skuId: fixtureB.skuId, quantity: 1 }],
      addressId: session.addressId,
      paymentMethod: "offline",
      quoteToken: crossQuotes.results[index].data.quoteToken,
      clientOrderKey: `mall-perf-cross-${runId}-${index}`,
      buyerRemark: `Mall cross-store performance ${runId}`
    }
  }));
  const crossGroups = await measureAll(crossInputs, ({ session, body }) => jsonApi(`/public/mall/checkout-groups?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userHeaders(session),
    body: JSON.stringify(body)
  }));
  const afterCross = await inventory(connection, [fixtureA.skuId, fixtureB.skuId]);

  const idempotentReplay = [];
  for (let index = 0; index < Math.min(10, crossInputs.length); index += 1) {
    const first = crossGroups.results[index];
    if (!first.ok) continue;
    const replay = await jsonApi(`/public/mall/checkout-groups?tenantCode=${TENANT_CODE}`, {
      method: "POST",
      headers: userHeaders(crossInputs[index].session),
      body: JSON.stringify(crossInputs[index].body)
    });
    idempotentReplay.push({ expectedId: first.data.id, actualId: replay.id, same: first.data.id === replay.id && first.data.groupNo === replay.groupNo });
  }

  const singleOrderIds = singleOrders.results.filter((item) => item.ok).map((item) => item.data?.id).filter(Boolean);
  const crossGroupIds = crossGroups.results.filter((item) => item.ok).map((item) => item.data?.id).filter(Boolean);
  const crossOrderIds = crossGroups.results.filter((item) => item.ok).flatMap((item) => item.data?.orders || []).map((item) => item.id).filter(Boolean);
  const deltaSingleA = afterSingle[fixtureA.skuId].lockedStock - beforeSingle[fixtureA.skuId].lockedStock;
  const deltaCrossA = afterCross[fixtureA.skuId].lockedStock - beforeCross[fixtureA.skuId].lockedStock;
  const deltaCrossB = afterCross[fixtureB.skuId].lockedStock - beforeCross[fixtureB.skuId].lockedStock;
  const failures = [];
  if (singleQuotes.metrics.failed) failures.push(`single quote errors: ${singleQuotes.metrics.failures.join(" | ")}`);
  if (crossQuotes.metrics.failed) failures.push(`cross quote errors: ${crossQuotes.metrics.failures.join(" | ")}`);
  if (singleOrders.metrics.failed) failures.push(`single order errors: ${singleOrders.metrics.failures.join(" | ")}`);
  if (crossGroups.metrics.failed) failures.push(`cross group errors: ${crossGroups.metrics.failures.join(" | ")}`);
  if (singleQuotes.metrics.p95Ms > thresholds.quoteP95Ms || crossQuotes.metrics.p95Ms > thresholds.quoteP95Ms) failures.push(`quote p95 exceeds ${thresholds.quoteP95Ms}ms`);
  if (singleOrders.metrics.p95Ms > thresholds.singleOrderP95Ms) failures.push(`single order p95 ${singleOrders.metrics.p95Ms}ms exceeds ${thresholds.singleOrderP95Ms}ms`);
  if (singleOrders.metrics.totalMs > thresholds.singleOrderTotalMs) failures.push(`single order total ${singleOrders.metrics.totalMs}ms exceeds ${thresholds.singleOrderTotalMs}ms`);
  if (crossGroups.metrics.p95Ms > thresholds.crossGroupP95Ms) failures.push(`cross group p95 ${crossGroups.metrics.p95Ms}ms exceeds ${thresholds.crossGroupP95Ms}ms`);
  if (crossGroups.metrics.totalMs > thresholds.crossGroupTotalMs) failures.push(`cross group total ${crossGroups.metrics.totalMs}ms exceeds ${thresholds.crossGroupTotalMs}ms`);
  if (singleOrderIds.length !== SINGLE_ORDERS || deltaSingleA !== SINGLE_ORDERS) failures.push(`single-store orders/inventory mismatch: orders=${singleOrderIds.length}, lockedDelta=${deltaSingleA}`);
  if (crossGroupIds.length !== CROSS_GROUPS || crossOrderIds.length !== CROSS_GROUPS * 2) failures.push(`cross-store group/suborder mismatch: groups=${crossGroupIds.length}, orders=${crossOrderIds.length}`);
  if (deltaCrossA !== CROSS_GROUPS || deltaCrossB !== CROSS_GROUPS) failures.push(`cross-store inventory mismatch: skuA=${deltaCrossA}, skuB=${deltaCrossB}`);
  if (!idempotentReplay.length || idempotentReplay.some((item) => !item.same)) failures.push("cross-store idempotent replay returned a different checkout group");

  const evidence = {
    passed: failures.length === 0,
    checkedAt: new Date().toISOString(),
    apiBase: API_BASE,
    tenantCode: TENANT_CODE,
    thresholds,
    fixture: { tenantId, merchantIds: [merchantA, merchantB], productIds: [fixtureA.productId, fixtureB.productId], skuIds: [fixtureA.skuId, fixtureB.skuId], users: sessions.length },
    metrics: { singleQuotes: singleQuotes.metrics, singleOrders: singleOrders.metrics, crossQuotes: crossQuotes.metrics, crossGroups: crossGroups.metrics },
    inventory: { beforeSingle, afterSingle, deltaSingleA, beforeCross, afterCross, deltaCrossA, deltaCrossB },
    idempotentReplay,
    retained: { phoneRange: `${sessions[0].phone}-${sessions.at(-1).phone}`, singleOrderIds, crossGroupIds, crossOrderIds },
    failures
  };
  fs.mkdirSync(resultDirectory, { recursive: true });
  fs.writeFileSync(resultFile, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...evidence, retained: { phoneRange: evidence.retained.phoneRange, singleOrders: singleOrderIds.length, crossGroups: crossGroupIds.length, crossOrders: crossOrderIds.length }, resultFile }, null, 2));
  assert(evidence.passed, `mall performance acceptance failed: ${failures.join("; ")}`);
} finally {
  if (connection) await connection.end();
}
