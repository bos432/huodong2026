import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { MallCoupon } from "./mall-coupon.entity";
import { MallOrder } from "./mall-order.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type MallCouponUsageStatus = "used" | "released";

@Entity("mall_coupon_usages")
@Unique(["order"])
@Index("IDX_mall_coupon_usages_tenant_coupon_user_status", ["tenant", "coupon", "user", "status"])
export class MallCouponUsage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallCoupon, { eager: true, nullable: false, onDelete: "CASCADE" })
  coupon!: MallCoupon;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "varchar", length: 40 })
  code!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discountAmount!: string;

  @Column({ type: "varchar", length: 24, default: "used" })
  status!: MallCouponUsageStatus;

  @Column({ type: "datetime", nullable: true })
  releasedAt!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  releaseReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
