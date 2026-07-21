import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { MallMerchant } from "./mall-merchant.entity";

@Entity("mall_promotion_risk_alerts")
@Index("UQ_mall_promotion_risk_alert_fingerprint", ["fingerprint"], { unique: true })
@Index("IDX_mall_promotion_risk_alert_scope", ["tenant", "merchant", "status", "severity", "lastDetectedAt"])
export class MallPromotionRiskAlert {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @Column({ type: "varchar", length: 64 })
  fingerprint!: string;

  @Column({ type: "varchar", length: 48 })
  ruleCode!: string;

  @Column({ type: "varchar", length: 16 })
  severity!: "medium" | "high" | "critical";

  @Column({ type: "varchar", length: 16, default: "open" })
  status!: "open" | "resolved" | "ignored";

  @Column({ type: "varchar", length: 32 })
  subjectType!: string;

  @Column({ type: "varchar", length: 100 })
  subjectId!: string;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "varchar", length: 1000 })
  message!: string;

  @Column({ type: "json", nullable: true })
  detail!: Record<string, unknown> | null;

  @Column({ type: "int", default: 1 })
  occurrenceCount!: number;

  @Column({ type: "datetime" })
  firstDetectedAt!: Date;

  @Column({ type: "datetime" })
  lastDetectedAt!: Date;

  @Column({ type: "int", nullable: true })
  resolvedByAdminId!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  resolvedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  resolutionRemark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
