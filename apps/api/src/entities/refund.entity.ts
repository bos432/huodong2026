import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Order } from "./order.entity";
import { Tenant } from "./tenant.entity";

@Entity("refunds")
export class Refund {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, { eager: true, onDelete: "CASCADE" })
  order!: Order;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 128, unique: true })
  refundNo!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  operator!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  reviewedBy!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  reviewRemark!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  completedAt!: Date | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  providerRefundNo!: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  providerRefundStatus!: string | null;

  @Column({ type: "datetime", nullable: true })
  providerRefundSyncedAt!: Date | null;

  @Column({ type: "json", nullable: true })
  providerRefundPayload!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  providerRefundFailureReason!: string | null;

  @Column({ type: "int", default: 0 })
  providerRefundRetryCount!: number;

  @Column({ type: "datetime", nullable: true })
  providerRefundNextQueryAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
