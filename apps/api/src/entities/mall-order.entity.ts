import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId, UpdateDateColumn } from "typeorm";
import { PaymentMethod } from "../shared/domain";
import { MallCoupon } from "./mall-coupon.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type MallOrderStatus = "pending_payment" | "pending_confirm" | "paid" | "shipped" | "completed" | "refund_pending" | "refunded" | "closed";

@Entity("mall_orders")
export class MallOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  orderNo!: string;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  goodsAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discountAmount!: string;

  @Column({ type: "int", default: 0 })
  pointsUsed!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  pointsDiscountAmount!: string;

  @Column({ type: "datetime", nullable: true })
  pointsRefundedAt!: Date | null;

  @ManyToOne(() => MallCoupon, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "couponId" })
  coupon!: MallCoupon | null;

  @RelationId((order: MallOrder) => order.coupon)
  couponId!: number | null;

  @Column({ type: "json", nullable: true })
  couponSnapshot!: Record<string, unknown> | null;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  freightAmount!: string;

  @Column({ type: "varchar", length: 24 })
  paymentMethod!: PaymentMethod;

  @Column({ type: "varchar", length: 80, nullable: true })
  clientOrderKey!: string | null;

  @Index()
  @Column({ type: "varchar", length: 32 })
  status!: MallOrderStatus;

  @Column({ type: "varchar", length: 128, nullable: true })
  transactionNo!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  promotionCode!: string | null;

  @Column({ type: "json", nullable: true })
  promotionSnapshot!: Record<string, unknown> | null;

  @Column({ type: "json" })
  addressSnapshot!: Record<string, unknown>;

  @Column({ type: "varchar", length: 80, nullable: true })
  expressCompany!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  expressNo!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  buyerRemark!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  adminRemark!: string | null;

  @Column({ type: "datetime", nullable: true })
  paidAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  shippedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  completedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  expiresAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  closedAt!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  closeReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
