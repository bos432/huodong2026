import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");

const database = process.env.DB_DATABASE || "activity_registration";
const outputFile = process.env.AUDIT_OUTPUT ? path.resolve(process.env.AUDIT_OUTPUT) : null;
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database
});

function quoteIdentifier(value) {
  return `\`${String(value).replaceAll("`", "``")}\``;
}

async function scalar(sql, parameters = []) {
  const [rows] = await connection.query(sql, parameters);
  return Number(Object.values(rows[0] || {})[0] || 0);
}

async function tableExists(table) {
  return Boolean(await scalar(
    "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
    [database, table]
  ));
}

async function columnExists(table, column) {
  return Boolean(await scalar(
    "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [database, table, column]
  ));
}

async function exactTableCounts() {
  const [tables] = await connection.query(
    "SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
    [database]
  );
  const counts = {};
  for (const { tableName } of tables) {
    counts[tableName] = await scalar(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`);
  }
  return counts;
}

async function moneyTotals() {
  const targets = [
    ["orders", "amountFen"],
    ["course_orders", "amountFen"],
    ["mall_orders", "amountFen"],
    ["payment_transactions", "amountFen"],
    ["refunds", "amountFen"],
    ["wallet_transactions", "amountFen"],
    ["mall_commissions", "amountFen"],
    ["mall_settlement_items", "amountFen"]
  ];
  const totals = {};
  for (const [table, column] of targets) {
    const exists = await columnExists(table, column);
    if (!exists) continue;
    const [rows] = await connection.query(
      `SELECT COUNT(*) AS rowCount, COALESCE(SUM(${quoteIdentifier(column)}), 0) AS total FROM ${quoteIdentifier(table)}`
    );
    totals[`${table}.${column}`] = {
      rowCount: Number(rows[0].rowCount),
      total: String(rows[0].total)
    };
  }
  return totals;
}

async function relationalMismatchCounts() {
  const targets = [
    ["member_profiles", "levelId"],
    ["activities", "minMemberLevelId"],
    ["activities", "priorityMemberLevelId"],
    ["courses", "requiredMemberLevelId"],
    ["orders", "memberLevelId"]
  ];
  const counts = {};
  for (const [table, column] of targets) {
    const exists = await columnExists(table, column);
    if (!exists) continue;
    counts[`${table}.${column}`] = await scalar(`
      SELECT COUNT(*) AS count
      FROM ${quoteIdentifier(table)} business
      INNER JOIN member_levels level ON level.id = business.${quoteIdentifier(column)}
      WHERE business.tenantId IS NOT NULL
        AND (level.tenantId IS NULL OR level.tenantId <> business.tenantId)
    `);
  }
  return counts;
}

async function audienceMismatchCounts() {
  const counts = {};
  for (const table of ["announcements", "marketing_popups", "ad_campaigns"]) {
    const exists = await tableExists(table);
    if (!exists) continue;
    counts[table] = await scalar(`
      SELECT COUNT(*) AS count
      FROM ${quoteIdentifier(table)} business
      INNER JOIN JSON_TABLE(
        COALESCE(business.audience, JSON_OBJECT()),
        '$.memberLevelIds[*]' COLUMNS(levelId INT PATH '$')
      ) audience_level
      LEFT JOIN member_levels level ON level.id = audience_level.levelId
      WHERE business.tenantId IS NOT NULL
        AND (level.id IS NULL OR level.tenantId IS NULL OR level.tenantId <> business.tenantId)
    `);
  }
  return counts;
}

async function collect() {
  const governed = await columnExists("member_levels", "tenantId");
  const hasProfileSnapshot = await columnExists("member_profiles", "levelSnapshot");
  const hasChangeTable = await tableExists("member_level_changes");
  const [migrationRows] = await connection.query(
    "SELECT timestamp, name FROM migrations ORDER BY id DESC LIMIT 3"
  );
  const [levelScopes] = governed
    ? await connection.query(`
        SELECT tenantScopeKey, tenantId, COUNT(*) AS levelCount,
          SUM(CASE WHEN templateLevelId IS NULL THEN 1 ELSE 0 END) AS withoutTemplate
        FROM member_levels
        GROUP BY tenantScopeKey, tenantId
        ORDER BY tenantId IS NOT NULL, tenantId
      `)
    : [[{ tenantScopeKey: "legacy_global", tenantId: null, levelCount: await scalar("SELECT COUNT(*) AS count FROM member_levels"), withoutTemplate: 0 }]];
  const [triggers] = await connection.query(
    "SELECT TRIGGER_NAME AS name, EVENT_MANIPULATION AS event, EVENT_OBJECT_TABLE AS tableName, ACTION_TIMING AS timing FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ? AND TRIGGER_NAME LIKE 'TRG_member_%' ORDER BY TRIGGER_NAME",
    [database]
  );

  const audit = {
    generatedAt: new Date().toISOString(),
    database,
    governed,
    migrations: migrationRows.map((row) => ({ timestamp: String(row.timestamp), name: row.name })),
    tableCounts: await exactTableCounts(),
    moneyTotals: await moneyTotals(),
    memberLevels: {
      total: await scalar("SELECT COUNT(*) AS count FROM member_levels"),
      platform: governed ? await scalar("SELECT COUNT(*) AS count FROM member_levels WHERE tenantId IS NULL") : await scalar("SELECT COUNT(*) AS count FROM member_levels"),
      tenant: governed ? await scalar("SELECT COUNT(*) AS count FROM member_levels WHERE tenantId IS NOT NULL") : 0,
      duplicateScopeNames: governed ? await scalar("SELECT COUNT(*) AS count FROM (SELECT tenantScopeKey, name FROM member_levels GROUP BY tenantScopeKey, name HAVING COUNT(*) > 1) duplicate_levels") : 0,
      tenantLevelsWithoutTemplate: governed ? await scalar("SELECT COUNT(*) AS count FROM member_levels WHERE tenantId IS NOT NULL AND templateLevelId IS NULL") : 0,
      scopes: levelScopes.map((row) => ({
        tenantScopeKey: row.tenantScopeKey,
        tenantId: row.tenantId == null ? null : Number(row.tenantId),
        levelCount: Number(row.levelCount),
        withoutTemplate: Number(row.withoutTemplate)
      }))
    },
    references: {
      relationalMismatchCounts: governed ? await relationalMismatchCounts() : null,
      audienceMismatchCounts: governed ? await audienceMismatchCounts() : null
    },
    profiles: {
      withLevel: await scalar("SELECT COUNT(*) AS count FROM member_profiles WHERE levelId IS NOT NULL"),
      missingSnapshot: hasProfileSnapshot ? await scalar("SELECT COUNT(*) AS count FROM member_profiles WHERE levelId IS NOT NULL AND levelSnapshot IS NULL") : null,
      snapshotLevelMismatch: hasProfileSnapshot ? await scalar("SELECT COUNT(*) AS count FROM member_profiles WHERE levelId IS NOT NULL AND CAST(JSON_UNQUOTE(JSON_EXTRACT(levelSnapshot, '$.id')) AS UNSIGNED) <> levelId") : null,
      snapshotScopeMismatch: hasProfileSnapshot ? await scalar("SELECT COUNT(*) AS count FROM member_profiles WHERE levelId IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(levelSnapshot, '$.tenantScopeKey')) <> tenantScopeKey") : null
    },
    levelChanges: {
      total: hasChangeTable ? await scalar("SELECT COUNT(*) AS count FROM member_level_changes") : null,
      baseline: hasChangeTable ? await scalar("SELECT COUNT(*) AS count FROM member_level_changes WHERE source = 'migration_baseline'") : null
    },
    triggers
  };
  return audit;
}

try {
  const result = await collect();
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputFile) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, serialized, "utf8");
  }
  process.stdout.write(serialized);
} finally {
  await connection.end();
}
