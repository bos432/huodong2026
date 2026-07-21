import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
const mysql = require("mysql2/promise");
const apiBase = String(process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const tenantCode = process.env.TENANT_CODE || "qiwai-showcase";
const otherTenantCode = process.env.OTHER_TENANT_CODE || "qiwai-hangzhou";
const stamp = Date.now();
const runId = `wallet-frozen-gift-${stamp}`;
const phone = `1357${String(stamp).slice(-7)}`;
const password = "Qiwai123456";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function raw(path, { method = "GET", token, body, tenant = tenantCode } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-tenant-code": tenant,
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { status: response.status, payload: text ? JSON.parse(text) : null, text };
}

async function request(path, options = {}) {
  const response = await raw(path, options);
  assert(response.status >= 200 && response.status < 300 && response.payload?.code === 0, `${options.method || "GET"} ${path} failed (${response.status}): ${response.text}`);
  return response.payload.data;
}

function amounts(wallet) {
  const fen = (value) => Math.round(Number(value || 0) * 100);
  return {
    cashFen: fen(wallet.availableBalance),
    frozenCashFen: fen(wallet.frozenBalance),
    giftFen: fen(wallet.giftBalance),
    frozenGiftFen: fen(wallet.frozenGiftBalance)
  };
}

function expectAmounts(actualWallet, expected, label) {
  const actual = amounts(actualWallet);
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  return actual;
}

function hashRow(row) {
  const canonical = [row.previousHash || "", row.walletId, row.transactionNo, row.direction, row.type, row.amount, row.balanceBefore, row.balanceAfter, row.frozenBefore, row.frozenAfter, row.giftBefore, row.giftAfter, row.frozenGiftBefore, row.frozenGiftAfter, row.idempotencyKey || ""].join("|");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

const adminLogin = await request("/admin/auth/login", { method: "POST", body: { username: "admin", password: "Admin123456" } });
const adminToken = adminLogin.token;
const tenants = await request("/admin/tenants", { token: adminToken });
const tenant = tenants.find((row) => row.code === tenantCode);
assert(tenant?.id, `tenant ${tenantCode} not found`);

const member = await request("/admin/members", {
  method: "POST",
  token: adminToken,
  body: { phone, password, nickname: `钱包冻结验收-${stamp}`, remark: runId }
});
const userId = Number(member.user.id);
const userLogin = await request("/public/auth/password-login", { method: "POST", body: { phone, password } });
const userToken = userLogin.userAccessToken;
assert(userId > 0 && userToken, "wallet acceptance member login failed");

async function adjust(type, amount, idempotencyKey, fundSource = "mixed") {
  return request(`/admin/users/${userId}/wallet/adjust`, {
    method: "POST",
    token: adminToken,
    body: { tenantId: tenant.id, type, amount, fundSource, idempotencyKey, remark: `${runId}:${type}:${fundSource}` }
  });
}

await adjust("recharge", 100, `${runId}:cash`);
await adjust("gift_grant", 250, `${runId}:gift`);
expectAmounts(await request("/public/me/wallet", { token: userToken }), { cashFen: 10000, frozenCashFen: 0, giftFen: 25000, frozenGiftFen: 0 }, "initial wallet");

const duplicateKey = `${runId}:freeze:duplicate`;
const duplicateFreeze = await Promise.all([
  adjust("freeze", 299, duplicateKey),
  adjust("freeze", 299, duplicateKey)
]);
assert(duplicateFreeze.filter((row) => row.idempotent === false).length === 1, "concurrent duplicate freeze must execute once");
assert(duplicateFreeze.filter((row) => row.idempotent === true).length === 1, "concurrent duplicate freeze must return one idempotent replay");
expectAmounts(await request("/public/me/wallet", { token: userToken }), { cashFen: 5100, frozenCashFen: 4900, giftFen: 0, frozenGiftFen: 25000 }, "mixed freeze");

await adjust("unfreeze", 100, `${runId}:unfreeze:mixed`);
expectAmounts(await request("/public/me/wallet", { token: userToken }), { cashFen: 5100, frozenCashFen: 4900, giftFen: 10000, frozenGiftFen: 15000 }, "mixed unfreeze");
await adjust("unfreeze", 49, `${runId}:unfreeze:cash`, "cash");
await adjust("unfreeze", 150, `${runId}:unfreeze:gift`, "gift");
expectAmounts(await request("/public/me/wallet", { token: userToken }), { cashFen: 10000, frozenCashFen: 0, giftFen: 25000, frozenGiftFen: 0 }, "source-specific unfreeze");

const concurrent = await Promise.all([
  raw(`/admin/users/${userId}/wallet/adjust`, { method: "POST", token: adminToken, body: { tenantId: tenant.id, type: "freeze", amount: 300, fundSource: "mixed", idempotencyKey: `${runId}:freeze:race:a`, remark: runId } }),
  raw(`/admin/users/${userId}/wallet/adjust`, { method: "POST", token: adminToken, body: { tenantId: tenant.id, type: "freeze", amount: 300, fundSource: "mixed", idempotencyKey: `${runId}:freeze:race:b`, remark: runId } })
]);
assert(concurrent.filter((row) => row.status === 201).length === 1 && concurrent.filter((row) => row.status === 400).length === 1, `oversubscription race must return one 201 and one 400: ${concurrent.map((row) => row.status)}`);
expectAmounts(await request("/public/me/wallet", { token: userToken }), { cashFen: 5000, frozenCashFen: 5000, giftFen: 0, frozenGiftFen: 25000 }, "oversubscription race");

const conflict = await raw(`/admin/users/${userId}/wallet/adjust`, { method: "POST", token: adminToken, body: { tenantId: tenant.id, type: "freeze", amount: 1, fundSource: "mixed", idempotencyKey: duplicateKey, remark: runId } });
assert(conflict.status === 409, `reused idempotency key with changed semantics must return 409, got ${conflict.status}`);
await adjust("unfreeze", 300, `${runId}:cleanup`);
expectAmounts(await request("/public/me/wallet", { token: userToken }), { cashFen: 10000, frozenCashFen: 0, giftFen: 25000, frozenGiftFen: 0 }, "final wallet");

const otherWallet = await request("/public/me/wallet", { token: userToken, tenant: otherTenantCode });
expectAmounts(otherWallet, { cashFen: 0, frozenCashFen: 0, giftFen: 0, frozenGiftFen: 0 }, "cross-tenant wallet");
const apiTransactions = await request(`/admin/finance/wallet-transactions?userId=${userId}&tenantId=${tenant.id}`, { token: adminToken });
const runTransactions = apiTransactions.filter((row) => String(row.idempotencyKey || "").startsWith(runId));
assert(runTransactions.length === 8, `expected 8 retained wallet rows, got ${runTransactions.length}`);
assert(runTransactions.every((row) => row.frozenGiftBefore !== undefined && row.frozenGiftAfter !== undefined), "API transaction projection is missing frozen gift snapshots");

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration"
});
const [[walletRow]] = await connection.query("SELECT id FROM user_wallets WHERE userId = ? AND tenantScopeKey = ?", [userId, String(tenant.id)]);
const [ledgerRows] = await connection.query("SELECT walletId, transactionNo, direction, type, CAST(amount AS CHAR) amount, CAST(balanceBefore AS CHAR) balanceBefore, CAST(balanceAfter AS CHAR) balanceAfter, CAST(frozenBefore AS CHAR) frozenBefore, CAST(frozenAfter AS CHAR) frozenAfter, CAST(giftBefore AS CHAR) giftBefore, CAST(giftAfter AS CHAR) giftAfter, CAST(frozenGiftBefore AS CHAR) frozenGiftBefore, CAST(frozenGiftAfter AS CHAR) frozenGiftAfter, idempotencyKey, previousHash, entryHash FROM wallet_transactions WHERE walletId = ? ORDER BY id ASC", [walletRow.id]);
await connection.end();
let previousHash = "";
for (const row of ledgerRows) {
  assert((row.previousHash || "") === previousHash, `wallet hash previous pointer mismatch at ${row.transactionNo}`);
  assert(hashRow(row) === row.entryHash, `wallet entry hash mismatch at ${row.transactionNo}`);
  previousHash = row.entryHash;
}

const outputDir = join(".local-logs", runId);
mkdirSync(outputDir, { recursive: true });
const result = {
  ok: true,
  runId,
  account: { phone, password, userId },
  adminAccount: { username: "admin", password: "Admin123456" },
  tenant: { id: tenant.id, code: tenantCode },
  concurrentDuplicateStatuses: duplicateFreeze.map((row) => ({ idempotent: row.idempotent, transactionId: row.walletTransaction.id })),
  oversubscriptionStatuses: concurrent.map((row) => row.status),
  idempotencyConflictStatus: conflict.status,
  retainedTransactionCount: runTransactions.length,
  verifiedLedgerRows: ledgerRows.length,
  finalWallet: amounts(await request("/public/me/wallet", { token: userToken }))
};
writeFileSync(join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...result, outputDir }, null, 2));
