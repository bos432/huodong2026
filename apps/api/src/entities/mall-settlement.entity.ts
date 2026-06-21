import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";

export type MallSettlementStatus = "draft" | "approved" | "paid" | "rejected" | "cancelled";

@Entity("mall_settlements")
@Index("IDX_mall_settlements_merchant_period", ["merchant", "periodStart", "periodEnd"])
export class MallSettlement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  settlementNo!: string;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: false, onDelete: "CASCADE" })
  merchant!: MallMerchant;

  @Column({ type: "date" })
  periodStart!: string;

  @Column({ type: "date" })
  periodEnd!: string;

  @Column({ type: "varchar", length: 32, default: "draft" })
  status!: MallSettlementStatus;

  @Column({ type: "varchar", length: 24 })
  paymentMode!: string;

  @Column({ type: "int", default: 0 })
  orderCount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  orderAmount!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  refundAmount!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  serviceFeeAmount!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  payableAmount!: string;

  @Column({ type: "json", nullable: true })
  snapshot!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  generatedBy!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  reviewedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  paidBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  paidAt!: Date | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  paidReference!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  paidProofUrl!: string | null;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
