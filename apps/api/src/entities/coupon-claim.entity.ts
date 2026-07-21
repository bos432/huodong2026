import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Coupon } from "./coupon.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("coupon_claims")
@Unique(["coupon", "user"])
export class CouponClaim {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @ManyToOne(() => Coupon, { eager: true, onDelete: "CASCADE" }) coupon!: Coupon;
  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" }) user!: User;
  @Column({ type: "int", default: 1 }) claimedCount!: number;
  @Column({ type: "int", default: 0 }) usedCount!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
