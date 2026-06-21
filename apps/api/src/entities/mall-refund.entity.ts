import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type MallRefundStatus = "pending" | "processing" | "approved" | "rejected" | "failed";
export type MallRefundType = "refund_only" | "return_refund";

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

  @Column({ type: "varchar", length: 32, default: "pending" })
  status!: MallRefundStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: "json", nullable: true })
  images!: string[] | null;

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
}
