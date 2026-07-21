import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class CharityFundLedger1783700000000 implements MigrationInterface {
  name = "CharityFundLedger1783700000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("charity_fund_accounts"))) {
      await queryRunner.createTable(new Table({
        name: "charity_fund_accounts",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "scopeKey", type: "varchar", length: "80" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "balanceFen", type: "bigint", default: 0 },
          { name: "reservedFen", type: "bigint", default: 0 },
          { name: "totalCreditFen", type: "bigint", default: 0 },
          { name: "totalDebitFen", type: "bigint", default: 0 },
          { name: "ledgerHeadHash", type: "varchar", length: "64", isNullable: true },
          { name: "ledgerSequence", type: "bigint", default: 0 },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" },
          { name: "version", type: "int", default: 1 }
        ]
      }));
      await queryRunner.createForeignKey("charity_fund_accounts", new TableForeignKey({ name: "FK_charity_fund_account_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
      await queryRunner.createIndex("charity_fund_accounts", new TableIndex({ name: "UQ_charity_fund_account_scope", columnNames: ["scopeKey"], isUnique: true }));
      await queryRunner.createIndex("charity_fund_accounts", new TableIndex({ name: "IDX_charity_fund_account_tenant", columnNames: ["tenantId"] }));
    }

    if (await queryRunner.hasTable("charity_fund_transactions")) {
      const columns = [
        new TableColumn({ name: "accountId", type: "int", isNullable: true }),
        new TableColumn({ name: "projectId", type: "int", isNullable: true }),
        new TableColumn({ name: "disbursementId", type: "int", isNullable: true }),
        new TableColumn({ name: "amountFen", type: "bigint", default: 0 }),
        new TableColumn({ name: "balanceBeforeFen", type: "bigint", default: 0 }),
        new TableColumn({ name: "balanceAfterFen", type: "bigint", default: 0 }),
        new TableColumn({ name: "ledgerSequence", type: "bigint", default: 0 }),
        new TableColumn({ name: "previousHash", type: "varchar", length: "64", isNullable: true }),
        new TableColumn({ name: "entryHash", type: "varchar", length: "64", isNullable: true }),
        new TableColumn({ name: "ledgerVersion", type: "varchar", length: "24", default: "'charity_ledger_v2'" }),
        new TableColumn({ name: "businessSnapshot", type: "json", isNullable: true })
      ];
      for (const column of columns) if (!(await queryRunner.hasColumn("charity_fund_transactions", column.name))) await queryRunner.addColumn("charity_fund_transactions", column);

      await queryRunner.query("INSERT INTO `charity_fund_accounts` (`scopeKey`,`tenantId`,`balanceFen`,`totalCreditFen`,`totalDebitFen`,`ledgerSequence`) SELECT CASE WHEN `tenantId` IS NULL THEN 'platform' ELSE CONCAT('tenant:', `tenantId`) END, `tenantId`, ROUND(SUM(CASE WHEN `direction` = 'credit' THEN `amount` ELSE -`amount` END) * 100), ROUND(SUM(CASE WHEN `direction` = 'credit' THEN `amount` ELSE 0 END) * 100), ROUND(SUM(CASE WHEN `direction` = 'debit' THEN `amount` ELSE 0 END) * 100), COUNT(*) FROM `charity_fund_transactions` GROUP BY `tenantId` ON DUPLICATE KEY UPDATE `balanceFen` = VALUES(`balanceFen`), `totalCreditFen` = VALUES(`totalCreditFen`), `totalDebitFen` = VALUES(`totalDebitFen`), `ledgerSequence` = VALUES(`ledgerSequence`)");
      await queryRunner.query("INSERT INTO `charity_fund_accounts` (`scopeKey`,`tenantId`) SELECT 'platform', NULL WHERE NOT EXISTS (SELECT 1 FROM `charity_fund_accounts` WHERE `scopeKey` = 'platform')");
      await queryRunner.query("UPDATE `charity_fund_transactions` tx INNER JOIN `charity_fund_accounts` account ON account.`scopeKey` = CASE WHEN tx.`tenantId` IS NULL THEN 'platform' ELSE CONCAT('tenant:', tx.`tenantId`) END SET tx.`accountId` = account.`id`, tx.`amountFen` = ROUND(tx.`amount` * 100), tx.`ledgerVersion` = 'legacy_v1'");

      const table = await queryRunner.getTable("charity_fund_transactions");
      for (const key of [
        new TableForeignKey({ name: "FK_charity_fund_tx_account", columnNames: ["accountId"], referencedTableName: "charity_fund_accounts", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_charity_fund_tx_project", columnNames: ["projectId"], referencedTableName: "charity_projects", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_charity_fund_tx_disbursement", columnNames: ["disbursementId"], referencedTableName: "charity_project_disbursements", referencedColumnNames: ["id"], onDelete: "SET NULL" })
      ]) if (!table?.foreignKeys.some((existing) => existing.name === key.name)) await queryRunner.createForeignKey("charity_fund_transactions", key);
      if (!table?.indices.some((index) => index.name === "IDX_charity_fund_tx_account_sequence")) await queryRunner.createIndex("charity_fund_transactions", new TableIndex({ name: "IDX_charity_fund_tx_account_sequence", columnNames: ["accountId", "ledgerSequence"] }));
      if (!table?.indices.some((index) => index.name === "IDX_charity_fund_tx_project")) await queryRunner.createIndex("charity_fund_transactions", new TableIndex({ name: "IDX_charity_fund_tx_project", columnNames: ["projectId", "createdAt"] }));
    }

    if (await queryRunner.hasTable("charity_project_disbursements")) {
      const columns = [
        new TableColumn({ name: "businessKey", type: "varchar", length: "160", isNullable: true }),
        new TableColumn({ name: "requestedById", type: "int", isNullable: true }),
        new TableColumn({ name: "reviewedById", type: "int", isNullable: true }),
        new TableColumn({ name: "paidById", type: "int", isNullable: true }),
        new TableColumn({ name: "cancelledById", type: "int", isNullable: true }),
        new TableColumn({ name: "stageNo", type: "int", default: 1 }),
        new TableColumn({ name: "status", type: "varchar", length: "24", default: "'pending_review'" }),
        new TableColumn({ name: "amountFen", type: "bigint", default: 0 }),
        new TableColumn({ name: "reviewRemark", type: "varchar", length: "500", isNullable: true }),
        new TableColumn({ name: "reviewBusinessKey", type: "varchar", length: "160", isNullable: true }),
        new TableColumn({ name: "paidReference", type: "varchar", length: "120", isNullable: true }),
        new TableColumn({ name: "paidRemark", type: "varchar", length: "500", isNullable: true }),
        new TableColumn({ name: "payBusinessKey", type: "varchar", length: "160", isNullable: true }),
        new TableColumn({ name: "reviewedAt", type: "datetime", isNullable: true }),
        new TableColumn({ name: "paidAt", type: "datetime", isNullable: true }),
        new TableColumn({ name: "cancelledAt", type: "datetime", isNullable: true }),
        new TableColumn({ name: "cancelRemark", type: "varchar", length: "500", isNullable: true }),
        new TableColumn({ name: "cancelBusinessKey", type: "varchar", length: "160", isNullable: true }),
        new TableColumn({ name: "requestSnapshot", type: "json", isNullable: true }),
        new TableColumn({ name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }),
        new TableColumn({ name: "version", type: "int", default: 1 })
      ];
      for (const column of columns) if (!(await queryRunner.hasColumn("charity_project_disbursements", column.name))) await queryRunner.addColumn("charity_project_disbursements", column);
      await queryRunner.query("UPDATE `charity_project_disbursements` SET `businessKey` = CONCAT('legacy-disbursement:', `id`), `requestedById` = `operatorId`, `reviewedById` = `operatorId`, `paidById` = `operatorId`, `status` = 'paid', `amountFen` = ROUND(`amount` * 100), `reviewedAt` = `createdAt`, `paidAt` = `createdAt` WHERE `businessKey` IS NULL");
      await queryRunner.changeColumn("charity_project_disbursements", "businessKey", new TableColumn({ name: "businessKey", type: "varchar", length: "160", isNullable: false }));
      const table = await queryRunner.getTable("charity_project_disbursements");
      for (const key of [
        new TableForeignKey({ name: "FK_charity_disbursement_requester", columnNames: ["requestedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_charity_disbursement_reviewer", columnNames: ["reviewedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_charity_disbursement_payer", columnNames: ["paidById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_charity_disbursement_canceller", columnNames: ["cancelledById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" })
      ]) if (!table?.foreignKeys.some((existing) => existing.name === key.name)) await queryRunner.createForeignKey("charity_project_disbursements", key);
      if (!table?.indices.some((index) => index.name === "UQ_charity_disbursement_business_key")) await queryRunner.createIndex("charity_project_disbursements", new TableIndex({ name: "UQ_charity_disbursement_business_key", columnNames: ["businessKey"], isUnique: true }));
      if (!table?.indices.some((index) => index.name === "IDX_charity_disbursement_project_status")) await queryRunner.createIndex("charity_project_disbursements", new TableIndex({ name: "IDX_charity_disbursement_project_status", columnNames: ["projectId", "status", "stageNo"] }));
      if (!table?.indices.some((index) => index.name === "UQ_charity_disbursement_review_key")) await queryRunner.createIndex("charity_project_disbursements", new TableIndex({ name: "UQ_charity_disbursement_review_key", columnNames: ["reviewBusinessKey"], isUnique: true }));
      if (!table?.indices.some((index) => index.name === "UQ_charity_disbursement_pay_key")) await queryRunner.createIndex("charity_project_disbursements", new TableIndex({ name: "UQ_charity_disbursement_pay_key", columnNames: ["payBusinessKey"], isUnique: true }));
      if (!table?.indices.some((index) => index.name === "UQ_charity_disbursement_cancel_key")) await queryRunner.createIndex("charity_project_disbursements", new TableIndex({ name: "UQ_charity_disbursement_cancel_key", columnNames: ["cancelBusinessKey"], isUnique: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("charity_fund_transactions")) {
      for (const name of ["businessSnapshot", "ledgerVersion", "entryHash", "previousHash", "ledgerSequence", "balanceAfterFen", "balanceBeforeFen", "amountFen", "disbursementId", "projectId", "accountId"]) {
        if (await queryRunner.hasColumn("charity_fund_transactions", name)) await queryRunner.dropColumn("charity_fund_transactions", name);
      }
    }
    if (await queryRunner.hasTable("charity_project_disbursements")) {
      for (const name of ["version", "updatedAt", "requestSnapshot", "cancelBusinessKey", "cancelRemark", "cancelledAt", "paidAt", "reviewedAt", "payBusinessKey", "paidRemark", "paidReference", "reviewBusinessKey", "reviewRemark", "amountFen", "status", "stageNo", "cancelledById", "paidById", "reviewedById", "requestedById", "businessKey"]) {
        if (await queryRunner.hasColumn("charity_project_disbursements", name)) await queryRunner.dropColumn("charity_project_disbursements", name);
      }
    }
    if (await queryRunner.hasTable("charity_fund_accounts")) await queryRunner.dropTable("charity_fund_accounts", true);
  }
}
