import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("analytics_calculation_runs")
@Index(["tenantScopeKey", "status", "createdAt"])
export class AnalyticsCalculationRun {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "varchar", length: 80, unique: true }) runId!: string;
  @Column({ type: "varchar", length: 32, default: "platform" }) tenantScopeKey!: string;
  @Column({ type: "date" }) startDate!: string;
  @Column({ type: "date" }) endDate!: string;
  @Column({ type: "varchar", length: 30, default: "pending" }) status!: string;
  @Column({ type: "varchar", length: 40, default: "manual" }) triggerType!: string;
  @Column({ type: "varchar", length: 80, nullable: true }) triggeredBy!: string | null;
  @Column({ type: "int", default: 0 }) metricCount!: number;
  @Column({ type: "int", default: 0 }) mismatchCount!: number;
  @Column({ type: "json", nullable: true }) validationSummary!: Record<string, unknown> | null;
  @Column({ type: "text", nullable: true }) errorMessage!: string | null;
  @Column({ type: "datetime", nullable: true }) startedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) completedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
