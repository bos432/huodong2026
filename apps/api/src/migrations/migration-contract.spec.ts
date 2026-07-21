import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationDirectory = __dirname;

describe("migration contracts", () => {
  it("keeps test files out of the production migration glob", () => {
    const dataSource = readFileSync(join(migrationDirectory, "..", "data-source.ts"), "utf8");
    expect(dataSource).toContain('`${__dirname}/migrations/[0-9]*.js`');
    expect(dataSource).toContain('"apps/api/src/migrations/[0-9]*.ts"');
    expect(dataSource).not.toContain("/migrations/*.js");
  });

  it("keeps new migration timestamps unique while preserving the known legacy collision", () => {
    const files = readdirSync(migrationDirectory).filter((file) => /^\d+-.*\.ts$/.test(file)).sort();
    const timestamps = files.map((file) => file.split("-")[0]);
    const duplicates = [...new Set(timestamps.filter((timestamp, index) => timestamps.indexOf(timestamp) !== index))];
    expect(duplicates).toEqual(["1781712000000"]);
    expect(files.filter((file) => file.startsWith("1781712000000-"))).toEqual([
      "1781712000000-CreateMallTables.ts",
      "1781712000000-TenantRegions.ts"
    ]);
    expect(timestamps.filter((timestamp) => Number(timestamp) > 1781712000000).length).toBe(
      new Set(timestamps.filter((timestamp) => Number(timestamp) > 1781712000000)).size
    );
  });

  it("requires every migration to expose reversible methods", () => {
    const files = readdirSync(migrationDirectory).filter((file) => /^\d+-.*\.ts$/.test(file));
    for (const file of files) {
      const source = readFileSync(join(migrationDirectory, file), "utf8");
      expect(source, `${file} must implement up()`).toMatch(/\b(?:async\s+)?up\s*\(/);
      expect(source, `${file} must implement down()`).toMatch(/\b(?:async\s+)?down\s*\(/);
    }
  });

  it("uses unique indexes instead of unsupported MySQL unique-constraint APIs", () => {
    const files = readdirSync(migrationDirectory).filter((file) => /^\d+-.*\.ts$/.test(file));
    for (const file of files) {
      const source = readFileSync(join(migrationDirectory, file), "utf8");
      expect(source, `${file} must not call createUniqueConstraint()`).not.toContain(".createUniqueConstraint(");
      expect(source, `${file} must not call dropUniqueConstraint()`).not.toContain(".dropUniqueConstraint(");
    }
  });

  it("pins the governance query indexes in both entities and migration", () => {
    const migration = readFileSync(join(migrationDirectory, "1783180000000-SaasGovernanceIndexes.ts"), "utf8");
    const expected = [
      "IDX_admin_operation_logs_tenant_created",
      "IDX_admin_operation_logs_action_target_created",
      "IDX_admin_operation_logs_admin_created",
      "IDX_tenant_subscription_events_action_created",
      "IDX_tenant_regions_tenant_status",
      "IDX_tenant_regions_city_status",
      "IDX_admin_users_tenant_enabled_role"
    ];
    for (const name of expected) expect(migration).toContain(name);
  });

  it("repairs duplicate mall reviews before enforcing the unique constraint", () => {
    const migration = readFileSync(join(migrationDirectory, "1783630000000-MallReviewGovernance.ts"), "utf8");
    expect(migration).toContain("mall_review_duplicate_archives");
    expect(migration).toContain("MIN(id) AS canonicalReviewId");
    expect(migration).toContain("DELETE duplicate FROM");
    expect(migration).toContain("CREATE UNIQUE INDEX `UQ_mall_reviews_order_item_user`");
    expect(migration).not.toContain("CREATE UNIQUE INDEX `UQ_mall_reviews_order_item_user` ON `mall_reviews` (`orderItemId`,`userId`)\").catch");
  });

  it("backfills platform coupon ownership and adds refund and promotion validity rules", () => {
    const migration = readFileSync(join(migrationDirectory, "1783650000000-MallCouponPromotionRules.ts"), "utf8");
    expect(migration).toContain('name: "issuerScope"');
    expect(migration).toContain('name: "refundReleasePolicy"');
    expect(migration).toContain("CASE WHEN merchantId IS NULL THEN 'platform' ELSE 'merchant' END");
    expect(migration).toContain('name: "startsAt"');
    expect(migration).toContain('name: "endsAt"');
  });

  it("creates persistent promotion rate windows and risk event audit tables", () => {
    const migration = readFileSync(join(migrationDirectory, "1783660000000-MallPromotionRateLimits.ts"), "utf8");
    expect(migration).toContain("mall_promotion_rate_limits");
    expect(migration).toContain("UQ_mall_promotion_rate_window");
    expect(migration).toContain("mall_promotion_risk_events");
    expect(migration).toContain("IDX_mall_promotion_risk_scope_created");
  });

  it("adds action-scoped counters and resolvable marketing risk alerts", () => {
    const migration = readFileSync(join(migrationDirectory, "1783670000000-MallPromotionRiskAlerts.ts"), "utf8");
    expect(migration).toContain('name: "action"');
    expect(migration).toContain("mall_promotion_risk_alerts");
    expect(migration).toContain("UQ_mall_promotion_risk_alert_fingerprint");
    expect(migration).toContain("ruleCode");
    expect(migration).toContain("severity");
  });

  it("adds versioned multi-level commission rules and immutable adjustments", () => {
    const migration = readFileSync(join(migrationDirectory, "1783680000000-MallCommissionRules.ts"), "utf8");
    expect(migration).toContain("mall_commission_rules");
    expect(migration).toContain("UQ_mall_commission_rule_version");
    expect(migration).toContain("parentAgentId");
    expect(migration).toContain("mall_commission_adjustments");
    expect(migration).toContain("UQ_mall_commission_adjustment_operation");
    expect(migration).toContain("UQ_mall_commission_operation");
    expect(migration).toContain("clawbackSettledAmount");
  });

  it("enforces user-scoped course order idempotency keys", () => {
    const migration = readFileSync(join(migrationDirectory, "1783770000000-CourseOrderIdempotency.ts"), "utf8");
    expect(migration).toContain('name: "clientOrderKey"');
    expect(migration).toContain("UQ_course_orders_user_client_key");
    expect(migration).toContain('columnNames: ["userId", "clientOrderKey"]');
  });

  it("scopes coupon and redemption codes by tenant and indexes their ledgers", () => {
    const migration = readFileSync(join(migrationDirectory, "1783850000000-CouponTenantGovernance.ts"), "utf8");
    expect(migration).toContain("UQ_coupons_tenant_code");
    expect(migration).toContain("UQ_redemption_codes_tenant_code");
    expect(migration).toContain("IDX_coupon_claims_tenant_created");
    expect(migration).toContain("IDX_coupon_usages_tenant_created");
    expect(migration).toContain("IDX_redemption_code_usages_tenant_created");
  });

  it("indexes payment provider account lookups and disables duplicate active rows without deleting history", () => {
    const migration = readFileSync(join(migrationDirectory, "1783860000000-AgentPaymentAccountGovernance.ts"), "utf8");
    expect(migration).toContain("IDX_agent_payment_accounts_agent_provider");
    expect(migration).toContain("SET account.enabled = 0");
    expect(migration).not.toContain("DELETE FROM agent_payment_accounts");
  });

  it("clones member levels per tenant and keeps immutable transition history", () => {
    const migration = readFileSync(join(migrationDirectory, "1783870000000-MemberLevelTenantGovernance.ts"), "utf8");
    for (const token of [
      "tenantScopeKey",
      "templateLevelId",
      "UQ_member_levels_scope_name",
      "member_level_changes",
      "levelSnapshot",
      "TRG_member_profiles_level_change",
      "TRG_member_level_changes_no_update",
      "TRG_member_level_changes_no_delete",
      "rewireRelationalReferences",
      "rewireAudienceReferences"
    ]) expect(migration).toContain(token);
    expect(migration).toContain("Cannot revert member level tenant governance while tenant-defined levels exist");
  });

  it("normalizes refund number collations during member point ledger backfills", () => {
    const migration = readFileSync(join(migrationDirectory, "1783880000000-MemberPointLedgerGovernance.ts"), "utf8");
    const normalizedRefundComparisons = migration.match(
      /CONVERT\((?:r|refund|candidate)\.refundNo USING utf8mb4\) COLLATE utf8mb4_unicode_ci = CONVERT\((?:p|claw)\.sourceId USING utf8mb4\) COLLATE utf8mb4_unicode_ci/g
    );
    expect(normalizedRefundComparisons).toHaveLength(6);
    expect(migration).not.toMatch(/(?:r|refund|candidate)\.refundNo = (?:p|claw)\.sourceId/);
    expect(migration.match(/CAST\(earned\.sourceId AS UNSIGNED\) = (?:refund\.orderId|businessOrder\.id)/g)).toHaveLength(3);
    expect(migration).not.toMatch(/earned\.sourceId = CAST\(.+? AS CHAR\)/);
  });

  it("governs member tag scopes, idempotent snapshots, and immutable snapshot history", () => {
    const migration = readFileSync(join(migrationDirectory, "1783890000000-MemberSegmentGovernance.ts"), "utf8");
    for (const token of [
      "tenantScopeKey",
      "UQ_user_tags_scope_user_name",
      "UQ_member_segments_scope_name",
      "businessKey",
      "UQ_member_segment_snapshot_business",
      "member_behavior_tag_runs",
      "UQ_member_behavior_run_idempotency",
      "TRG_member_segment_snapshots_no_update",
      "TRG_member_segment_snapshots_no_delete",
      "TRG_member_segment_snapshot_members_no_update",
      "TRG_member_segment_snapshot_members_no_delete"
    ]) expect(migration).toContain(token);
    expect(migration).toContain("Duplicate user tag blocks governance migration");
    expect(migration).not.toContain("DELETE FROM user_tags");
  });

  it("backfills historical charity entries into the runtime hash-chain format", () => {
    const migration = readFileSync(join(migrationDirectory, "1783780000000-CharityLedgerHistoryBackfill.ts"), "utf8");
    expect(migration).toContain("charityLedgerEntryHash");
    expect(migration).toContain("__charityLedgerHistoryBackfill");
    expect(migration).toContain("ledgerHeadHash");
    expect(migration).toContain("ledgerVersion` = 'charity_ledger_v2'");
  });

  it("keeps every supported activity form field type in the database enum", () => {
    const migration = readFileSync(join(migrationDirectory, "1783810000000-ActivityFieldTypes.ts"), "utf8");
    for (const type of ["text", "single_choice", "multiple_choice", "phone", "id_card", "remark", "email", "number", "date", "date_time", "region", "address", "attachment"]) {
      expect(migration).toContain(`"${type}"`);
    }
    expect(migration).toContain("Cannot restore the legacy activity field enum while newer field types are in use");
  });
});
