import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MallCommissionAdjustment } from "./mall-commission-adjustment.entity";
import { MallCommission } from "./mall-commission.entity";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { MallRefund } from "./mall-refund.entity";
import { MallSettlement } from "./mall-settlement.entity";
import { Tenant } from "./tenant.entity";

export type MallSettlementLineType = "order" | "refund" | "commission" | "commission_clawback" | "service_fee" | "manual_adjustment";

@Entity("mall_settlement_lines")
@Index("UQ_mall_settlement_line_operation", ["operationKey"], { unique: true })
@Index("IDX_mall_settlement_line_settlement", ["settlement", "lineType", "createdAt"])
export class MallSettlementLine {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: false, onDelete: "CASCADE" })
  merchant!: MallMerchant;

  @ManyToOne(() => MallSettlement, { eager: true, nullable: false, onDelete: "CASCADE" })
  settlement!: MallSettlement;

  @ManyToOne(() => MallOrder, { eager: true, nullable: true, onDelete: "SET NULL" })
  order!: MallOrder | null;

  @ManyToOne(() => MallRefund, { eager: true, nullable: true, onDelete: "SET NULL" })
  refund!: MallRefund | null;

  @ManyToOne(() => MallCommission, { eager: true, nullable: true, onDelete: "SET NULL" })
  commission!: MallCommission | null;

  @ManyToOne(() => MallCommissionAdjustment, { eager: true, nullable: true, onDelete: "SET NULL" })
  commissionAdjustment!: MallCommissionAdjustment | null;

  @Column({ type: "varchar", length: 160 })
  operationKey!: string;

  @Column({ type: "varchar", length: 32 })
  lineType!: MallSettlementLineType;

  @Column({ type: "varchar", length: 32 })
  sourceType!: string;

  @Column({ type: "varchar", length: 80 })
  sourceId!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  businessNo!: string | null;

  @Column({ type: "varchar", length: 8 })
  direction!: "credit" | "debit";

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  grossAmount!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  feeAmount!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  commissionAmount!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  payableAmount!: string;

  @Column({ type: "json", nullable: true })
  snapshot!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
