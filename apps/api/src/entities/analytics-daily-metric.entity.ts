import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity("analytics_daily_metrics")
@Unique(["tenantScopeKey", "dimensionType", "dimensionKey", "metricDate", "metricKey"])
@Index(["tenantScopeKey", "metricDate", "metricKey"])
export class AnalyticsDailyMetric {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "varchar", length: 32, default: "platform" }) tenantScopeKey!: string;
  @Column({ type: "varchar", length: 40, default: "platform" }) dimensionType!: string;
  @Column({ type: "varchar", length: 80, default: "all" }) dimensionKey!: string;
  @Column({ type: "date" }) metricDate!: string;
  @Column({ type: "varchar", length: 80 }) metricKey!: string;
  @Column({ type: "bigint", default: 0 }) value!: string;
  @Column({ type: "bigint", default: 0 }) amountFen!: string;
  @Column({ type: "json", nullable: true }) breakdown!: Record<string, unknown> | null;
  @Column({ type: "varchar", length: 80, nullable: true }) calculationVersion!: string | null;
  @Column({ type: "varchar", length: 80, nullable: true }) sourceRunId!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
