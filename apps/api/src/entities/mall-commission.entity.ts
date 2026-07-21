import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Agent } from "./agent.entity";
import { MallCommissionRule } from "./mall-commission-rule.entity";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { MallOrderItem } from "./mall-order-item.entity";
import { MallProduct } from "./mall-product.entity";
import { MallPromotionCode } from "./mall-promotion-code.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type MallCommissionStatus = "risk_review" | "pending" | "void" | "settled";

@Entity("mall_commissions")
@Index("UQ_mall_commission_operation", ["operationKey"], { unique: true })
@Index("IDX_mall_commission_beneficiary", ["tenant", "beneficiaryType", "beneficiaryKey", "status"])
export class MallCommission {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => MallOrderItem, { eager: true, nullable: true, onDelete: "SET NULL" })
  orderItem!: MallOrderItem | null;

  @ManyToOne(() => MallProduct, { eager: true, nullable: true, onDelete: "SET NULL" })
  product!: MallProduct | null;

  @ManyToOne(() => MallCommissionRule, { eager: true, nullable: true, onDelete: "SET NULL" })
  rule!: MallCommissionRule | null;

  @ManyToOne(() => MallPromotionCode, { eager: true, nullable: true, onDelete: "SET NULL" })
  promotionCode!: MallPromotionCode | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  promoterUser!: User | null;

  @ManyToOne(() => Agent, { eager: true, nullable: true, onDelete: "SET NULL" })
  agent!: Agent | null;

  @Column({ type: "varchar", length: 160 })
  operationKey!: string;

  @Column({ type: "varchar", length: 16, default: "unassigned" })
  beneficiaryType!: "promoter" | "agent" | "unassigned";

  @Column({ type: "varchar", length: 80, default: "unassigned" })
  beneficiaryKey!: string;

  @Column({ type: "int", default: 0 })
  beneficiaryLevel!: number;

  @Column({ type: "varchar", length: 40 })
  code!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  orderAmount!: string;

  @Column({ type: "decimal", precision: 8, scale: 4 })
  commissionRate!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  commissionAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  originalCommissionAmount!: string;

  @Column({ type: "json", nullable: true })
  ruleSnapshot!: Record<string, unknown> | null;

  @Column({ type: "json", nullable: true })
  calculationSnapshot!: Record<string, unknown> | null;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  refundedOrderAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  clawbackAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  clawbackSettledAmount!: string;

  @Column({ type: "varchar", length: 24, default: "none" })
  clawbackStatus!: "none" | "pending" | "settled";

  @Column({ type: "datetime", nullable: true })
  clawbackSettledAt!: Date | null;

  @Column({ type: "int", nullable: true })
  clawbackSettledByAdminId!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  clawbackSettledBy!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  clawbackSettleRemark!: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  clawbackOperationKey!: string | null;

  @Index()
  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: MallCommissionStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  voidReason!: string | null;

  @Column({ type: "datetime", nullable: true })
  voidedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  settledAt!: Date | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  settledBy!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  settleRemark!: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  settleOperationKey!: string | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  riskReviewReason!: string | null;

  @Column({ type: "int", nullable: true })
  riskReviewedByAdminId!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  riskReviewedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  riskReviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
