import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from "typeorm";

async function uniqueIndexNames(queryRunner: QueryRunner, columns: string[]) {
  return queryRunner.query(
    "SELECT INDEX_NAME AS name FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'member_point_logs' AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY' GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = ?",
    [columns.join(",")]
  ) as Promise<Array<{ name: string }>>;
}

async function dropUniqueIndexes(queryRunner: QueryRunner, columns: string[]) {
  for (const row of await uniqueIndexNames(queryRunner, columns)) {
    await queryRunner.query(`ALTER TABLE member_point_logs DROP INDEX \`${String(row.name).replace(/`/g, "``")}\``);
  }
}

type HistoricalRefundClawbackRow = {
  earnedLogId: number;
  userId: number;
  tenantId: number | null;
  tenantScopeKey: string;
  earnedPoints: number | string;
  orderId: number;
  paidAmountFen: number | string;
  refundedAmountFen: number | string;
  priorClawbackPoints: number | string;
};

function cumulativeClawbackTarget(row: HistoricalRefundClawbackRow) {
  const earnedPoints = Math.max(Math.trunc(Number(row.earnedPoints || 0)), 0);
  const paidAmountFen = Math.max(Math.trunc(Number(row.paidAmountFen || 0)), 0);
  const refundedAmountFen = Math.min(Math.max(Math.trunc(Number(row.refundedAmountFen || 0)), 0), paidAmountFen);
  if (!earnedPoints || !paidAmountFen || !refundedAmountFen) return 0;
  if (refundedAmountFen >= paidAmountFen) return earnedPoints;
  return Math.min(Math.floor((earnedPoints * refundedAmountFen) / paidAmountFen), earnedPoints);
}

async function repairHistoricalRefundClawbacks(queryRunner: QueryRunner, business: "activity" | "mall") {
  const sourceType = business === "activity" ? "order_refund" : "mall_order_refund";
  const orderTable = business === "activity" ? "orders" : "mall_orders";
  const refundTable = business === "activity" ? "refunds" : "mall_refunds";
  const completedStatus = business === "activity" ? "completed" : "approved";
  const earnedSourceType = business === "activity" ? "order_paid" : "mall_order_paid";
  const rows = await queryRunner.query(`
    SELECT earned.id earnedLogId, earned.userId, earned.tenantId, earned.tenantScopeKey,
      earned.points earnedPoints, businessOrder.id orderId, businessOrder.amountFen paidAmountFen,
      COALESCE(SUM(businessRefund.amountFen), 0) refundedAmountFen,
      COALESCE((
        SELECT SUM(-COALESCE(NULLIF(claw.requestedPoints, 0), claw.points))
        FROM member_point_logs claw
        WHERE claw.relatedLogId = earned.id AND claw.sourceType = ?
      ), 0) priorClawbackPoints
    FROM member_point_logs earned
    JOIN ${orderTable} businessOrder ON businessOrder.id = CAST(earned.sourceId AS UNSIGNED)
    JOIN ${refundTable} businessRefund ON businessRefund.orderId = businessOrder.id AND businessRefund.status = ?
    WHERE earned.sourceType = ? AND businessOrder.amountFen > 0
    GROUP BY earned.id, earned.userId, earned.tenantId, earned.tenantScopeKey, earned.points, businessOrder.id, businessOrder.amountFen
  `, [sourceType, completedStatus, earnedSourceType]) as HistoricalRefundClawbackRow[];

  for (const row of rows) {
    const target = cumulativeClawbackTarget(row);
    const prior = Math.max(Math.trunc(Number(row.priorClawbackPoints || 0)), 0);
    const correctionPoints = prior - target;
    if (!correctionPoints) continue;
    const sourceId = `refund_clawback_repair:${business}:${row.orderId}`;
    await queryRunner.query(`
      INSERT IGNORE INTO member_point_logs (
        userId, tenantId, tenantScopeKey, growthValue, expiresAt, expiryProcessedAt, reversedAt,
        points, requestedPoints, balanceBefore, balanceAfter, type, sourceType, sourceId,
        relatedLogId, batchKey, ruleSnapshot, metadata, remark, createdAt
      ) VALUES (?, ?, ?, 0, NULL, NULL, NULL, ?, ?, NULL, NULL, 'adjust', ?, ?, ?,
        'migration:1783880000000:refund_clawback_repair',
        JSON_OBJECT('mode', 'cumulative_refund_ratio_repair'),
        JSON_OBJECT('business', ?, 'orderId', ?, 'targetClawbackPoints', ?, 'priorClawbackPoints', ?, 'correctionPoints', ?),
        '历史退款积分累计比例校准', NOW(6))
    `, [row.userId, row.tenantId, row.tenantScopeKey, correctionPoints, correctionPoints, sourceType, sourceId, row.earnedLogId, business, row.orderId, target, prior, correctionPoints]);
  }
}

export class MemberPointLedgerGovernance1783880000000 implements MigrationInterface {
  name = "MemberPointLedgerGovernance1783880000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("member_point_rules"))) {
      await queryRunner.query(`
        CREATE TABLE member_point_rules (
          id int NOT NULL AUTO_INCREMENT,
          tenantId int NULL,
          tenantScopeKey varchar(32) NOT NULL DEFAULT 'platform',
          templateRuleId int NULL,
          eventType varchar(40) NOT NULL,
          name varchar(80) NOT NULL,
          enabled tinyint NOT NULL DEFAULT 1,
          calculationMode varchar(24) NOT NULL DEFAULT 'fixed',
          fixedPoints int NOT NULL DEFAULT 0,
          amountFenPerPoint int NOT NULL DEFAULT 100,
          growthMode varchar(24) NOT NULL DEFAULT 'same_as_points',
          fixedGrowth int NOT NULL DEFAULT 0,
          validityDays int NULL,
          version int NOT NULL DEFAULT 1,
          createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (id),
          UNIQUE KEY UQ_member_point_rule_scope_event (tenantScopeKey, eventType),
          KEY IDX_member_point_rules_tenant (tenantId),
          KEY IDX_member_point_rules_template (templateRuleId),
          CONSTRAINT FK_member_point_rules_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
          CONSTRAINT FK_member_point_rules_template FOREIGN KEY (templateRuleId) REFERENCES member_point_rules(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
    await queryRunner.query(`
      INSERT IGNORE INTO member_point_rules (tenantId, tenantScopeKey, templateRuleId, eventType, name, enabled, calculationMode, fixedPoints, amountFenPerPoint, growthMode, fixedGrowth, validityDays, version)
      VALUES
        (NULL, 'platform', NULL, 'activity_order_paid', '活动消费积分', 1, 'amount_ratio', 1, 100, 'same_as_points', 0, NULL, 1),
        (NULL, 'platform', NULL, 'mall_order_paid', '商城消费积分', 1, 'amount_ratio', 1, 100, 'same_as_points', 0, NULL, 1),
        (NULL, 'platform', NULL, 'activity_check_in', '活动签到奖励', 1, 'fixed', 20, 100, 'same_as_points', 0, NULL, 1),
        (NULL, 'platform', NULL, 'activity_review', '活动评价奖励', 1, 'fixed', 10, 100, 'same_as_points', 0, NULL, 1)
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO member_point_rules (tenantId, tenantScopeKey, templateRuleId, eventType, name, enabled, calculationMode, fixedPoints, amountFenPerPoint, growthMode, fixedGrowth, validityDays, version)
      SELECT tenant.id, CONCAT('tenant:', tenant.id), template.id, template.eventType, template.name, template.enabled, template.calculationMode, template.fixedPoints, template.amountFenPerPoint, template.growthMode, template.fixedGrowth, template.validityDays, template.version
      FROM tenants tenant CROSS JOIN member_point_rules template
      WHERE template.tenantScopeKey = 'platform'
    `);
    const pointColumns = [
      new TableColumn({ name: "requestedPoints", type: "int", default: 0 }),
      new TableColumn({ name: "balanceBefore", type: "int", isNullable: true }),
      new TableColumn({ name: "balanceAfter", type: "int", isNullable: true }),
      new TableColumn({ name: "relatedLogId", type: "int", isNullable: true }),
      new TableColumn({ name: "batchKey", type: "varchar", length: "120", isNullable: true }),
      new TableColumn({ name: "ruleSnapshot", type: "json", isNullable: true }),
      new TableColumn({ name: "metadata", type: "json", isNullable: true })
    ];
    for (const column of pointColumns) if (!(await queryRunner.hasColumn("member_point_logs", column.name))) await queryRunner.addColumn("member_point_logs", column);
    if (!(await queryRunner.hasColumn("member_profiles", "pointDebt"))) await queryRunner.addColumn("member_profiles", new TableColumn({ name: "pointDebt", type: "int", default: 0 }));

    await queryRunner.query("UPDATE member_point_logs SET requestedPoints = points WHERE requestedPoints = 0");

    await queryRunner.query(`UPDATE member_point_logs p JOIN activity_reviews r ON r.id = CAST(p.sourceId AS UNSIGNED) JOIN activities a ON a.id = r.activityId SET p.tenantId = a.tenantId, p.tenantScopeKey = IF(a.tenantId IS NULL, 'platform', CONCAT('tenant:', a.tenantId)) WHERE p.sourceType = 'activity_review'`);
    await queryRunner.query(`UPDATE member_point_logs p JOIN check_ins c ON c.id = CAST(p.sourceId AS UNSIGNED) JOIN registrations r ON r.id = c.registrationId SET p.tenantId = r.tenantId, p.tenantScopeKey = IF(r.tenantId IS NULL, 'platform', CONCAT('tenant:', r.tenantId)) WHERE p.sourceType = 'check_in'`);
    await queryRunner.query(`UPDATE member_point_logs p JOIN orders o ON o.id = CAST(p.sourceId AS UNSIGNED) SET p.tenantId = o.tenantId, p.tenantScopeKey = IF(o.tenantId IS NULL, 'platform', CONCAT('tenant:', o.tenantId)) WHERE p.sourceType IN ('order_paid','points_redeem','points_return')`);
    await queryRunner.query(`UPDATE member_point_logs p JOIN refunds r ON CONVERT(r.refundNo USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(p.sourceId USING utf8mb4) COLLATE utf8mb4_unicode_ci JOIN orders o ON o.id = r.orderId SET p.tenantId = o.tenantId, p.tenantScopeKey = IF(o.tenantId IS NULL, 'platform', CONCAT('tenant:', o.tenantId)) WHERE p.sourceType = 'order_refund'`);
    await queryRunner.query(`UPDATE member_point_logs p JOIN mall_orders o ON o.id = CAST(p.sourceId AS UNSIGNED) SET p.tenantId = o.tenantId, p.tenantScopeKey = IF(o.tenantId IS NULL, 'platform', CONCAT('tenant:', o.tenantId)) WHERE p.sourceType IN ('mall_order_paid','mall_points_redeem','mall_points_return')`);
    await queryRunner.query(`UPDATE member_point_logs p JOIN mall_orders o ON o.id = CAST(p.sourceId AS UNSIGNED) AND o.userId = p.userId SET p.tenantId = o.tenantId, p.tenantScopeKey = IF(o.tenantId IS NULL, 'platform', CONCAT('tenant:', o.tenantId)) WHERE p.sourceType = 'mall_order_refund' AND o.createdAt <= p.createdAt AND NOT EXISTS (SELECT 1 FROM mall_refunds candidate WHERE (candidate.id = CAST(p.sourceId AS UNSIGNED) OR CONVERT(candidate.refundNo USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(p.sourceId USING utf8mb4) COLLATE utf8mb4_unicode_ci) AND candidate.userId = p.userId AND candidate.createdAt <= p.createdAt)`);
    await queryRunner.query(`UPDATE member_point_logs p JOIN mall_refunds r ON (r.id = CAST(p.sourceId AS UNSIGNED) OR CONVERT(r.refundNo USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(p.sourceId USING utf8mb4) COLLATE utf8mb4_unicode_ci) AND r.userId = p.userId JOIN mall_orders o ON o.id = r.orderId SET p.tenantId = o.tenantId, p.tenantScopeKey = IF(o.tenantId IS NULL, 'platform', CONCAT('tenant:', o.tenantId)) WHERE p.sourceType = 'mall_order_refund'`);
    await queryRunner.query(`UPDATE member_point_logs p JOIN mall_checkout_groups g ON g.id = CAST(p.sourceId AS UNSIGNED) SET p.tenantId = g.tenantId, p.tenantScopeKey = IF(g.tenantId IS NULL, 'platform', CONCAT('tenant:', g.tenantId)) WHERE p.sourceType = 'mall_checkout_points_redeem'`);

    await dropUniqueIndexes(queryRunner, ["sourceType", "sourceId"]);
    const pointTable = await queryRunner.getTable("member_point_logs");
    if (!pointTable?.indices.some((index) => index.name === "UQ_member_point_scope_user_source")) await queryRunner.createIndex("member_point_logs", new TableIndex({ name: "UQ_member_point_scope_user_source", columnNames: ["tenantScopeKey", "userId", "sourceType", "sourceId"], isUnique: true }));
    if (!pointTable?.indices.some((index) => index.name === "IDX_member_points_expiry_batch")) await queryRunner.createIndex("member_point_logs", new TableIndex({ name: "IDX_member_points_expiry_batch", columnNames: ["tenantScopeKey", "expiryProcessedAt", "expiresAt"] }));
    if (!pointTable?.indices.some((index) => index.name === "IDX_member_points_related_log")) await queryRunner.createIndex("member_point_logs", new TableIndex({ name: "IDX_member_points_related_log", columnNames: ["relatedLogId"] }));
    const refreshedPointTable = await queryRunner.getTable("member_point_logs");
    if (!refreshedPointTable?.foreignKeys.some((foreignKey) => foreignKey.columnNames.includes("relatedLogId"))) await queryRunner.createForeignKey("member_point_logs", new TableForeignKey({ name: "FK_member_point_logs_related", columnNames: ["relatedLogId"], referencedTableName: "member_point_logs", referencedColumnNames: ["id"], onDelete: "RESTRICT" }));

    await queryRunner.query(`UPDATE member_point_logs claw JOIN refunds refund ON CONVERT(refund.refundNo USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(claw.sourceId USING utf8mb4) COLLATE utf8mb4_unicode_ci JOIN member_point_logs earned ON earned.sourceType = 'order_paid' AND CAST(earned.sourceId AS UNSIGNED) = refund.orderId AND earned.userId = claw.userId AND earned.tenantScopeKey = claw.tenantScopeKey SET claw.relatedLogId = earned.id WHERE claw.sourceType = 'order_refund'`);
    await queryRunner.query(`UPDATE member_point_logs returned JOIN member_point_logs redeemed ON redeemed.sourceType = 'points_redeem' AND redeemed.sourceId = returned.sourceId AND redeemed.userId = returned.userId AND redeemed.tenantScopeKey = returned.tenantScopeKey SET returned.relatedLogId = redeemed.id WHERE returned.sourceType = 'points_return'`);
    await queryRunner.query(`UPDATE member_point_logs claw JOIN mall_orders businessOrder ON businessOrder.id = CAST(claw.sourceId AS UNSIGNED) AND businessOrder.userId = claw.userId JOIN member_point_logs earned ON earned.sourceType = 'mall_order_paid' AND CAST(earned.sourceId AS UNSIGNED) = businessOrder.id AND earned.userId = claw.userId AND earned.tenantScopeKey = claw.tenantScopeKey SET claw.relatedLogId = earned.id WHERE claw.sourceType = 'mall_order_refund' AND claw.relatedLogId IS NULL AND businessOrder.createdAt <= claw.createdAt AND NOT EXISTS (SELECT 1 FROM mall_refunds candidate WHERE (candidate.id = CAST(claw.sourceId AS UNSIGNED) OR CONVERT(candidate.refundNo USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(claw.sourceId USING utf8mb4) COLLATE utf8mb4_unicode_ci) AND candidate.userId = claw.userId AND candidate.createdAt <= claw.createdAt)`);
    await queryRunner.query(`UPDATE member_point_logs claw JOIN mall_refunds refund ON (refund.id = CAST(claw.sourceId AS UNSIGNED) OR CONVERT(refund.refundNo USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(claw.sourceId USING utf8mb4) COLLATE utf8mb4_unicode_ci) AND refund.userId = claw.userId JOIN member_point_logs earned ON earned.sourceType = 'mall_order_paid' AND CAST(earned.sourceId AS UNSIGNED) = refund.orderId AND earned.userId = claw.userId AND earned.tenantScopeKey = claw.tenantScopeKey SET claw.relatedLogId = earned.id WHERE claw.sourceType = 'mall_order_refund' AND claw.relatedLogId IS NULL`);
    await queryRunner.query(`UPDATE member_point_logs returned JOIN member_point_logs redeemed ON redeemed.sourceType IN ('mall_points_redeem','mall_checkout_points_redeem') AND redeemed.sourceId = returned.sourceId AND redeemed.userId = returned.userId AND redeemed.tenantScopeKey = returned.tenantScopeKey SET returned.relatedLogId = redeemed.id WHERE returned.sourceType = 'mall_points_return'`);

    await repairHistoricalRefundClawbacks(queryRunner, "activity");
    await repairHistoricalRefundClawbacks(queryRunner, "mall");

    await queryRunner.query(`
      INSERT INTO member_profiles (userId, tenantId, tenantScopeKey, levelId, points, pointDebt, growthValue, growthCycleStartedAt, levelStartedAt, levelExpiresAt, levelSource, levelSnapshot, totalSpent, registrationCount, checkInCount, reviewCount, lastActiveAt, createdAt, updatedAt)
      SELECT accounts.userId, accounts.tenantId, accounts.tenantScopeKey, NULL, 0, 0, 0, NULL, NULL, NULL, 'growth', NULL, '0.00', 0, 0, 0, NULL, NOW(6), NOW(6)
      FROM (SELECT userId, tenantScopeKey, MAX(tenantId) tenantId FROM member_point_logs GROUP BY userId, tenantScopeKey) accounts
      LEFT JOIN member_profiles profile ON profile.userId = accounts.userId AND profile.tenantScopeKey = accounts.tenantScopeKey
      WHERE profile.id IS NULL
    `);

    const negativeAccounts = await queryRunner.query(`
      SELECT userId, tenantScopeKey, MAX(tenantId) tenantId, SUM(CASE WHEN reversedAt IS NULL AND (expiresAt IS NULL OR expiresAt > NOW()) THEN points ELSE 0 END) balance
      FROM member_point_logs GROUP BY userId, tenantScopeKey
      HAVING balance < 0
    `) as Array<{ userId: number; tenantScopeKey: string; tenantId: number | null; balance: string }>;
    for (const account of negativeAccounts) {
      const debt = Math.abs(Number(account.balance || 0));
      await queryRunner.query(`
        INSERT INTO member_point_logs (userId, tenantId, tenantScopeKey, growthValue, expiresAt, expiryProcessedAt, reversedAt, points, requestedPoints, balanceBefore, balanceAfter, type, sourceType, sourceId, relatedLogId, batchKey, ruleSnapshot, metadata, remark, createdAt)
        VALUES (?, ?, ?, 0, NULL, NULL, NULL, ?, ?, ?, 0, 'adjust', 'points_balance_repair', ?, NULL, 'migration:1783880000000', NULL, JSON_OBJECT('reason','historical_negative_balance','debtCreated',?), '历史负积分转为可追踪欠额', NOW(6))
      `, [account.userId, account.tenantId, account.tenantScopeKey, debt, debt, Number(account.balance), `migration:1783880000000:${account.tenantScopeKey}:${account.userId}`, debt]);
      await queryRunner.query("UPDATE member_profiles SET pointDebt = pointDebt + ? WHERE userId = ? AND tenantScopeKey = ?", [debt, account.userId, account.tenantScopeKey]);
    }

    await queryRunner.query(`
      UPDATE member_profiles profile
      LEFT JOIN (
        SELECT userId, tenantScopeKey,
          SUM(CASE WHEN reversedAt IS NULL AND (expiresAt IS NULL OR expiresAt > NOW()) THEN points ELSE 0 END) points,
          SUM(CASE WHEN reversedAt IS NULL THEN growthValue ELSE 0 END) growthValue
        FROM member_point_logs GROUP BY userId, tenantScopeKey
      ) ledger ON ledger.userId = profile.userId AND ledger.tenantScopeKey = profile.tenantScopeKey
      SET profile.points = GREATEST(COALESCE(ledger.points, 0), 0), profile.growthValue = GREATEST(COALESCE(ledger.growthValue, 0), 0)
    `);

    await queryRunner.query(`
      UPDATE member_point_logs target
      JOIN (
        SELECT id, runningAfter - effectivePoints balanceBefore, runningAfter balanceAfter
        FROM (
          SELECT id, effectivePoints,
            SUM(effectivePoints) OVER (PARTITION BY tenantScopeKey, userId ORDER BY createdAt, id ROWS UNBOUNDED PRECEDING) runningAfter
          FROM (
            SELECT id, tenantScopeKey, userId, createdAt, CASE WHEN reversedAt IS NULL THEN points ELSE 0 END effectivePoints
            FROM member_point_logs
          ) sourceRows
        ) windowedRows
      ) snapshots ON snapshots.id = target.id
      SET target.balanceBefore = snapshots.balanceBefore, target.balanceAfter = snapshots.balanceAfter
    `);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query("DELETE FROM member_point_logs WHERE batchKey = 'migration:1783880000000:refund_clawback_repair'");
    const duplicates = await queryRunner.query("SELECT sourceType, sourceId, COUNT(*) total FROM member_point_logs GROUP BY sourceType, sourceId HAVING total > 1 LIMIT 1") as Array<{ sourceType: string; sourceId: string }>;
    if (duplicates.length) throw new Error(`Cannot restore global point source uniqueness while duplicate source exists: ${duplicates[0].sourceType}/${duplicates[0].sourceId}`);
    await queryRunner.query("DELETE FROM member_point_logs WHERE sourceType = 'points_balance_repair' AND batchKey = 'migration:1783880000000'");
    const pointTable = await queryRunner.getTable("member_point_logs");
    for (const foreignKey of pointTable?.foreignKeys.filter((item) => item.columnNames.includes("relatedLogId")) || []) await queryRunner.dropForeignKey("member_point_logs", foreignKey);
    for (const indexName of ["UQ_member_point_scope_user_source", "IDX_member_points_expiry_batch", "IDX_member_points_related_log"]) {
      const table = await queryRunner.getTable("member_point_logs");
      if (table?.indices.some((index) => index.name === indexName)) await queryRunner.dropIndex("member_point_logs", indexName);
    }
    if (!(await uniqueIndexNames(queryRunner, ["sourceType", "sourceId"])).length) await queryRunner.createIndex("member_point_logs", new TableIndex({ name: "IDX_member_point_source", columnNames: ["sourceType", "sourceId"], isUnique: true }));
    for (const name of ["metadata", "ruleSnapshot", "batchKey", "relatedLogId", "balanceAfter", "balanceBefore", "requestedPoints"]) if (await queryRunner.hasColumn("member_point_logs", name)) await queryRunner.dropColumn("member_point_logs", name);
    if (await queryRunner.hasColumn("member_profiles", "pointDebt")) await queryRunner.dropColumn("member_profiles", "pointDebt");
    if (await queryRunner.hasTable("member_point_rules")) await queryRunner.dropTable("member_point_rules", true);
  }
}
