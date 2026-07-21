import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Coupon } from "./coupon.entity";
import { Order } from "./order.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("coupon_usages")
@Unique(["order"])
export class CouponUsage {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @ManyToOne(() => Coupon, { eager: true, onDelete: "CASCADE" }) coupon!: Coupon;
  @ManyToOne(() => Order, { eager: true, onDelete: "CASCADE" }) order!: Order;
  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" }) user!: User;
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 }) discountAmount!: string;
  @Column({ type: "varchar", length: 24, default: "used" }) status!: "used" | "released";
  @Column({ type: "datetime", nullable: true }) releasedAt!: Date | null;
  @Column({ type: "varchar", length: 255, nullable: true }) releaseReason!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
