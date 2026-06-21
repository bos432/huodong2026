import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { MallCoupon } from "./mall-coupon.entity";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("mall_coupon_claims")
@Unique(["coupon", "user"])
@Index("IDX_mall_coupon_claims_tenant_user", ["tenant", "user"])
export class MallCouponClaim {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallCoupon, { eager: true, nullable: false, onDelete: "CASCADE" })
  coupon!: MallCoupon;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "int", default: 1 })
  claimedCount!: number;

  @Column({ type: "int", default: 0 })
  usedCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
