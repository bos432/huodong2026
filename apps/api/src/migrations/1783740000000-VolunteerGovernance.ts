import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class VolunteerGovernance1783740000000 implements MigrationInterface {
  name = "VolunteerGovernance1783740000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of [
      new TableColumn({ name: "profileNo", type: "varchar", length: "64", isNullable: true }),
      new TableColumn({ name: "applicationBusinessKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "phoneMasked", type: "varchar", length: "20", isNullable: true }),
      new TableColumn({ name: "phoneLookupHash", type: "varchar", length: "64", isNullable: true }),
      new TableColumn({ name: "phoneEncrypted", type: "text", isNullable: true }),
      new TableColumn({ name: "skills", type: "json", isNullable: true }),
      new TableColumn({ name: "availability", type: "json", isNullable: true }),
      new TableColumn({ name: "identityStatus", type: "varchar", length: "24", default: "'pending'" }),
      new TableColumn({ name: "identityVerifiedAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "qualificationStatus", type: "varchar", length: "24", default: "'unqualified'" }),
      new TableColumn({ name: "qualificationExpiresAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "emergencyContactEncrypted", type: "text", isNullable: true }),
      new TableColumn({ name: "remarkEncrypted", type: "text", isNullable: true }),
      new TableColumn({ name: "statusReason", type: "varchar", length: "500", isNullable: true }),
      new TableColumn({ name: "version", type: "int", default: 1 })
    ]) await this.addColumnIfMissing(queryRunner, "volunteer_profiles", column);
    await queryRunner.query("UPDATE volunteer_profiles SET profileNo = CONCAT('VLPLEGACY', LPAD(id, 10, '0')) WHERE profileNo IS NULL");
    await queryRunner.query("UPDATE volunteer_profiles SET applicationBusinessKey = CONCAT('legacy-volunteer-profile:', id) WHERE applicationBusinessKey IS NULL");
    await queryRunner.query("UPDATE volunteer_profiles SET phoneMasked = CASE WHEN CHAR_LENGTH(phone) >= 11 THEN CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 4)) ELSE phone END WHERE phoneMasked IS NULL");
    await queryRunner.query("UPDATE volunteer_profiles SET phoneLookupHash = CONCAT('legacy:', LPAD(id, 57, '0')) WHERE phoneLookupHash IS NULL");
    await this.addIndexIfMissing(queryRunner, "volunteer_profiles", new TableIndex({ name: "UQ_volunteer_profile_no", columnNames: ["profileNo"], isUnique: true }));
    await this.addIndexIfMissing(queryRunner, "volunteer_profiles", new TableIndex({ name: "UQ_volunteer_profile_application_key", columnNames: ["applicationBusinessKey"], isUnique: true }));
    await this.addIndexIfMissing(queryRunner, "volunteer_profiles", new TableIndex({ name: "IDX_volunteer_profile_phone_hash", columnNames: ["phoneLookupHash"] }));
    await this.addIndexIfMissing(queryRunner, "volunteer_profiles", new TableIndex({ name: "IDX_volunteer_profile_qualification", columnNames: ["qualificationStatus", "qualificationExpiresAt"] }));

    for (const column of [
      new TableColumn({ name: "taskNo", type: "varchar", length: "64", isNullable: true }),
      new TableColumn({ name: "businessKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "tenantId", type: "int", isNullable: true }),
      new TableColumn({ name: "projectId", type: "int", isNullable: true }),
      new TableColumn({ name: "recruitmentStartsAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "recruitmentEndsAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "waitlistEnabled", type: "boolean", default: true }),
      new TableColumn({ name: "requiredSkills", type: "json", isNullable: true }),
      new TableColumn({ name: "qualificationRequired", type: "boolean", default: false }),
      new TableColumn({ name: "minimumTrainingHours", type: "decimal", precision: 8, scale: 2, default: 0 }),
      new TableColumn({ name: "cancellationDeadlineHours", type: "int", default: 24 }),
      new TableColumn({ name: "checkInOpensMinutesBefore", type: "int", default: 60 }),
      new TableColumn({ name: "checkOutClosesMinutesAfter", type: "int", default: 120 }),
      new TableColumn({ name: "latitude", type: "decimal", precision: 10, scale: 7, isNullable: true }),
      new TableColumn({ name: "longitude", type: "decimal", precision: 10, scale: 7, isNullable: true }),
      new TableColumn({ name: "version", type: "int", default: 1 })
    ]) await this.addColumnIfMissing(queryRunner, "volunteer_tasks", column);
    await queryRunner.query("UPDATE volunteer_tasks SET taskNo = CONCAT('VLTLEGACY', LPAD(id, 10, '0')), businessKey = CONCAT('legacy-volunteer-task:', id) WHERE taskNo IS NULL OR businessKey IS NULL");
    await this.addIndexIfMissing(queryRunner, "volunteer_tasks", new TableIndex({ name: "UQ_volunteer_task_no", columnNames: ["taskNo"], isUnique: true }));
    await this.addIndexIfMissing(queryRunner, "volunteer_tasks", new TableIndex({ name: "UQ_volunteer_task_business_key", columnNames: ["businessKey"], isUnique: true }));
    await this.addIndexIfMissing(queryRunner, "volunteer_tasks", new TableIndex({ name: "IDX_volunteer_task_recruitment", columnNames: ["status", "recruitmentStartsAt", "recruitmentEndsAt"] }));
    await this.addForeignKeyIfMissing(queryRunner, "volunteer_tasks", new TableForeignKey({ name: "FK_volunteer_task_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    await this.addForeignKeyIfMissing(queryRunner, "volunteer_tasks", new TableForeignKey({ name: "FK_volunteer_task_project", columnNames: ["projectId"], referencedTableName: "charity_projects", referencedColumnNames: ["id"], onDelete: "SET NULL" }));

    for (const column of [
      new TableColumn({ name: "businessKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "applicationIdentityKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "phoneMasked", type: "varchar", length: "20", isNullable: true }),
      new TableColumn({ name: "phoneLookupHash", type: "varchar", length: "64", isNullable: true }),
      new TableColumn({ name: "messageEncrypted", type: "text", isNullable: true }),
      new TableColumn({ name: "remarkEncrypted", type: "text", isNullable: true }),
      new TableColumn({ name: "lastActionBusinessKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "waitlistPosition", type: "int", isNullable: true }),
      new TableColumn({ name: "admittedAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "cancelledAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "cancellationReason", type: "varchar", length: "500", isNullable: true }),
      new TableColumn({ name: "replacedById", type: "int", isNullable: true }),
      new TableColumn({ name: "checkedInAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "completedAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "version", type: "int", default: 1 })
    ]) await this.addColumnIfMissing(queryRunner, "volunteer_task_applications", column);
    await queryRunner.query("UPDATE volunteer_task_applications SET status = 'admitted' WHERE status = 'approved'");
    await queryRunner.query("UPDATE volunteer_task_applications SET businessKey = CONCAT('legacy-volunteer-application:', id), applicationIdentityKey = CONCAT('legacy-volunteer-identity:', id), phoneMasked = CASE WHEN CHAR_LENGTH(phone) >= 11 THEN CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 4)) ELSE phone END, phoneLookupHash = CONCAT('legacy:', LPAD(id, 57, '0')) WHERE businessKey IS NULL OR applicationIdentityKey IS NULL OR phoneMasked IS NULL OR phoneLookupHash IS NULL");
    await this.addIndexIfMissing(queryRunner, "volunteer_task_applications", new TableIndex({ name: "UQ_volunteer_application_business_key", columnNames: ["businessKey"], isUnique: true }));
    await this.addIndexIfMissing(queryRunner, "volunteer_task_applications", new TableIndex({ name: "UQ_volunteer_application_identity_key", columnNames: ["applicationIdentityKey"], isUnique: true }));
    await this.addIndexIfMissing(queryRunner, "volunteer_task_applications", new TableIndex({ name: "IDX_volunteer_application_phone_hash", columnNames: ["phoneLookupHash"] }));
    await this.addIndexIfMissing(queryRunner, "volunteer_task_applications", new TableIndex({ name: "UQ_volunteer_application_action_key", columnNames: ["lastActionBusinessKey"], isUnique: true }));
    await this.addIndexIfMissing(queryRunner, "volunteer_task_applications", new TableIndex({ name: "IDX_volunteer_task_application_queue", columnNames: ["taskId", "status", "createdAt"] }));
    await this.addForeignKeyIfMissing(queryRunner, "volunteer_task_applications", new TableForeignKey({ name: "FK_volunteer_application_replaced_by", columnNames: ["replacedById"], referencedTableName: "volunteer_task_applications", referencedColumnNames: ["id"], onDelete: "SET NULL" }));

    for (const column of [
      new TableColumn({ name: "businessKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "applicationRecordKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "submittedHours", type: "decimal", precision: 8, scale: 2, default: 0 }),
      new TableColumn({ name: "confirmedHours", type: "decimal", precision: 8, scale: 2, default: 0 }),
      new TableColumn({ name: "status", type: "varchar", length: "40", default: "'pending_volunteer'" }),
      new TableColumn({ name: "proofEncrypted", type: "text", isNullable: true }),
      new TableColumn({ name: "feedbackEncrypted", type: "text", isNullable: true }),
      new TableColumn({ name: "volunteerConfirmedById", type: "int", isNullable: true }),
      new TableColumn({ name: "volunteerConfirmedAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "volunteerConfirmationKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "supervisorConfirmedById", type: "int", isNullable: true }),
      new TableColumn({ name: "supervisorConfirmedAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "supervisorConfirmationKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "rejectionReasonEncrypted", type: "text", isNullable: true }),
      new TableColumn({ name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }),
      new TableColumn({ name: "version", type: "int", default: 1 })
    ]) await this.addColumnIfMissing(queryRunner, "volunteer_service_records", column);
    await queryRunner.query("UPDATE volunteer_service_records SET businessKey = CONCAT('legacy-volunteer-service:', id), applicationRecordKey = CONCAT('legacy-volunteer-record:', id), submittedHours = hours, confirmedHours = hours, status = 'confirmed' WHERE businessKey IS NULL OR applicationRecordKey IS NULL");
    await this.addIndexIfMissing(queryRunner, "volunteer_service_records", new TableIndex({ name: "UQ_volunteer_service_business_key", columnNames: ["businessKey"], isUnique: true }));
    await this.addIndexIfMissing(queryRunner, "volunteer_service_records", new TableIndex({ name: "UQ_volunteer_service_record_key", columnNames: ["applicationRecordKey"], isUnique: true }));
    await this.addIndexIfMissing(queryRunner, "volunteer_service_records", new TableIndex({ name: "UQ_volunteer_service_volunteer_confirmation", columnNames: ["volunteerConfirmationKey"], isUnique: true }));
    await this.addIndexIfMissing(queryRunner, "volunteer_service_records", new TableIndex({ name: "UQ_volunteer_service_supervisor_confirmation", columnNames: ["supervisorConfirmationKey"], isUnique: true }));
    await this.addForeignKeyIfMissing(queryRunner, "volunteer_service_records", new TableForeignKey({ name: "FK_volunteer_service_volunteer_confirmer", columnNames: ["volunteerConfirmedById"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    await this.addForeignKeyIfMissing(queryRunner, "volunteer_service_records", new TableForeignKey({ name: "FK_volunteer_service_supervisor_confirmer", columnNames: ["supervisorConfirmedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }));

    if (!(await queryRunner.hasTable("volunteer_training_records"))) await queryRunner.createTable(new Table({
      name: "volunteer_training_records",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "businessKey", type: "varchar", length: "160" }, { name: "profileId", type: "int" }, { name: "title", type: "varchar", length: "120" }, { name: "provider", type: "varchar", length: "120", isNullable: true }, { name: "trainingHours", type: "decimal", precision: 8, scale: 2, default: 0 },
        { name: "completedAt", type: "datetime" }, { name: "expiresAt", type: "datetime", isNullable: true }, { name: "status", type: "varchar", length: "24", default: "'pending'" }, { name: "certificateEncrypted", type: "text", isNullable: true }, { name: "reviewRemarkEncrypted", type: "text", isNullable: true }, { name: "reviewedById", type: "int", isNullable: true }, { name: "reviewBusinessKey", type: "varchar", length: "160", isNullable: true }, { name: "reviewedAt", type: "datetime", isNullable: true }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
      ],
      foreignKeys: [
        { name: "FK_volunteer_training_profile", columnNames: ["profileId"], referencedTableName: "volunteer_profiles", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_volunteer_training_reviewer", columnNames: ["reviewedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ],
      indices: [
        { name: "UQ_volunteer_training_business_key", columnNames: ["businessKey"], isUnique: true }, { name: "UQ_volunteer_training_review_key", columnNames: ["reviewBusinessKey"], isUnique: true }, { name: "IDX_volunteer_training_profile_status", columnNames: ["profileId", "status", "expiresAt"] }
      ]
    }));

    if (!(await queryRunner.hasTable("volunteer_attendance_records"))) await queryRunner.createTable(new Table({
      name: "volunteer_attendance_records",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "businessKey", type: "varchar", length: "160" }, { name: "applicationId", type: "int" }, { name: "action", type: "varchar", length: "24" }, { name: "method", type: "varchar", length: "24" }, { name: "tokenNonce", type: "varchar", length: "80", isNullable: true }, { name: "occurredAt", type: "datetime" }, { name: "locationSnapshot", type: "json", isNullable: true }, { name: "evidenceEncrypted", type: "text", isNullable: true }, { name: "recordedByUserId", type: "int", isNullable: true }, { name: "recordedByAdminId", type: "int", isNullable: true }, { name: "status", type: "varchar", length: "24", default: "'valid'" }, { name: "reversalReasonEncrypted", type: "text", isNullable: true }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
      ],
      foreignKeys: [
        { name: "FK_volunteer_attendance_application", columnNames: ["applicationId"], referencedTableName: "volunteer_task_applications", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_volunteer_attendance_user", columnNames: ["recordedByUserId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "SET NULL" },
        { name: "FK_volunteer_attendance_admin", columnNames: ["recordedByAdminId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ],
      indices: [
        { name: "UQ_volunteer_attendance_business_key", columnNames: ["businessKey"], isUnique: true }, { name: "UQ_volunteer_attendance_application_action", columnNames: ["applicationId", "action"], isUnique: true }
      ]
    }));

    if (!(await queryRunner.hasTable("volunteer_hour_adjustments"))) await queryRunner.createTable(new Table({
      name: "volunteer_hour_adjustments",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "businessKey", type: "varchar", length: "160" }, { name: "profileId", type: "int" }, { name: "serviceRecordId", type: "int", isNullable: true }, { name: "reversalOfId", type: "int", isNullable: true }, { name: "deltaHours", type: "decimal", precision: 8, scale: 2 }, { name: "action", type: "varchar", length: "24" }, { name: "reasonEncrypted", type: "text" }, { name: "createdById", type: "int", isNullable: true }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
      ],
      foreignKeys: [
        { name: "FK_volunteer_hour_adjustment_profile", columnNames: ["profileId"], referencedTableName: "volunteer_profiles", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_volunteer_hour_adjustment_record", columnNames: ["serviceRecordId"], referencedTableName: "volunteer_service_records", referencedColumnNames: ["id"], onDelete: "SET NULL" },
        { name: "FK_volunteer_hour_adjustment_reversal", columnNames: ["reversalOfId"], referencedTableName: "volunteer_hour_adjustments", referencedColumnNames: ["id"], onDelete: "SET NULL" },
        { name: "FK_volunteer_hour_adjustment_admin", columnNames: ["createdById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ],
      indices: [
        { name: "UQ_volunteer_hour_adjustment_business_key", columnNames: ["businessKey"], isUnique: true }, { name: "IDX_volunteer_hour_adjustment_profile", columnNames: ["profileId", "createdAt"] }
      ]
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ["volunteer_hour_adjustments", "volunteer_attendance_records", "volunteer_training_records"]) if (await queryRunner.hasTable(table)) await queryRunner.dropTable(table, true);
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    if (!(await queryRunner.hasColumn(tableName, column.name))) await queryRunner.addColumn(tableName, column);
  }

  private async addIndexIfMissing(queryRunner: QueryRunner, tableName: string, index: TableIndex) {
    const table = await queryRunner.getTable(tableName);
    if (table && !table.indices.some((item) => item.name === index.name)) await queryRunner.createIndex(tableName, index);
  }

  private async addForeignKeyIfMissing(queryRunner: QueryRunner, tableName: string, foreignKey: TableForeignKey) {
    const table = await queryRunner.getTable(tableName);
    if (table && !table.foreignKeys.some((item) => item.name === foreignKey.name)) await queryRunner.createForeignKey(tableName, foreignKey);
  }
}
