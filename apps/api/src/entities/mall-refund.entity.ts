import { BeforeInsert, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { yuanToFen } from "../shared/money";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type MallRefundStatus = "pending" | "awaiting_buyer_return" | "returning" | "awaiting_merchant_receipt" | "awaiting_exchange_shipment" | "exchange_shipped" | "platform_intervening" | "processing" | "approved" | "rejected" | "failed" | "cancelled";
export type MallRefundType = "refund_only" | "return_refund" | "exchange";

@Entity("mall_refunds")
export class MallRefund {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  refundNo!: string;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @Column({ type: "varchar", length: 24, default: "refund_only" })
  type!: MallRefundType;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;
  @Column({ type: "bigint", default: 0 }) amountFen!: number;
  @Column({ type: "json", nullable: true }) businessSnapshot!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 32, default: "pending" })
  status!: MallRefundStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: "json", nullable: true })
  images!: string[] | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  businessKey!: string | null;

  @Column({ type: "json", nullable: true })
  returnAddressSnapshot!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  returnExpressCompany!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  returnExpressNo!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  returnRemark!: string | null;

  @Column({ type: "datetime", nullable: true })
  returnedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  merchantReceivedAt!: Date | null;

  @Column({ type: "int", nullable: true })
  exchangeShipmentId!: number | null;

  @Column({ type: "varchar", length: 24, default: "undetermined" })
  responsibility!: "undetermined" | "buyer" | "merchant" | "logistics" | "platform";

  @Column({ type: "boolean", default: false })
  platformInterventionRequested!: boolean;

  @Column({ type: "varchar", length: 80, nullable: true })
  interventionBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  interventionAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  responseDeadlineAt!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  reviewRemark!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  reviewedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  completedAt!: Date | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  providerRefundNo!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  providerRefundStatus!: string | null;

  @Column({ type: "datetime", nullable: true })
  providerRefundSyncedAt!: Date | null;

  @Column({ type: "json", nullable: true })
  providerRefundPayload!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  providerRefundFailureReason!: string | null;

  @Column({ type: "int", default: 0 })
  providerRefundRetryCount!: number;

  @Column({ type: "datetime", nullable: true })
  providerRefundNextQueryAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  freezeBusinessMoney() {
    this.amountFen = yuanToFen(this.amount);
    this.businessSnapshot ||= { refundNo: this.refundNo, type: this.type, amount: this.amount, reason: this.reason, orderNo: this.order?.orderNo || null, orderAmount: this.order?.amount || null, paymentMethod: this.order?.paymentMethod || null, merchantId: this.merchant?.id || null };
  }
}
