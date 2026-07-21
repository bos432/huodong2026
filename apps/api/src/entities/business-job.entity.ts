import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type BusinessJobStatus = "pending" | "processing" | "completed" | "dead_letter" | "cancelled";

@Entity("business_jobs")
@Index("IDX_business_jobs_idempotency", ["tenantId", "type", "idempotencyKey"], { unique: true })
@Index("IDX_business_jobs_due", ["status", "nextAttemptAt", "lockedUntil"])
@Index("IDX_business_jobs_tenant_created", ["tenantId", "createdAt"])
export class BusinessJob {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "int", default: 0 }) tenantId!: number;
  @Column({ type: "varchar", length: 80 }) type!: string;
  @Column({ type: "varchar", length: 120 }) idempotencyKey!: string;
  @Column({ type: "varchar", length: 20, default: "pending" }) status!: BusinessJobStatus;
  @Column({ type: "json" }) payload!: Record<string, unknown>;
  @Column({ type: "json", nullable: true }) result!: Record<string, unknown> | null;
  @Column({ type: "int", default: 0 }) attemptCount!: number;
  @Column({ type: "int", default: 5 }) maxAttempts!: number;
  @Column({ type: "datetime" }) nextAttemptAt!: Date;
  @Column({ type: "datetime", nullable: true }) lockedUntil!: Date | null;
  @Column({ type: "varchar", length: 80, nullable: true }) lockedBy!: string | null;
  @Column({ type: "varchar", length: 80, nullable: true }) lastWorkerId!: string | null;
  @Column({ type: "datetime", nullable: true }) lastStartedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) lastFinishedAt!: Date | null;
  @Column({ type: "varchar", length: 1000, nullable: true }) lastError!: string | null;
  @Column({ type: "varchar", length: 80, nullable: true }) requestId!: string | null;
  @Column({ type: "datetime", nullable: true }) completedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) deadLetteredAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
