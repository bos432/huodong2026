import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MallCommission } from "./mall-commission.entity";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { MallRefund } from "./mall-refund.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_commission_adjustments")
@Index("UQ_mall_commission_adjustment_operation", ["operationKey"], { unique: true })
@Index("IDX_mall_commission_adjustment_scope", ["tenant", "merchant", "createdAt"])
export class MallCommissionAdjustment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallCommission, { eager: true, nullable: false, onDelete: "CASCADE" })
  commission!: MallCommission;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => MallRefund, { eager: true, nullable: true, onDelete: "SET NULL" })
  refund!: MallRefund | null;

  @Column({ type: "varchar", length: 160 })
  operationKey!: string;

  @Column({ type: "varchar", length: 32 })
  type!: "refund_reduction" | "refund_clawback" | "clawback_settlement" | "risk_release" | "risk_reject" | "settlement";

  @Column({ type: "varchar", length: 8 })
  direction!: "credit" | "debit";

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  beforeAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  afterAmount!: string;

  @Column({ type: "json", nullable: true })
  snapshot!: Record<string, unknown> | null;

  @Column({ type: "int", nullable: true })
  operatorAdminId!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  operator!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
