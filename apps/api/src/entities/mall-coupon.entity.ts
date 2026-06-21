import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";

export type MallCouponScope = "all" | "category" | "product";

@Entity("mall_coupons")
@Index("IDX_mall_coupons_tenant_code", ["tenant", "code"], { unique: true })
export class MallCoupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @Column({ type: "varchar", length: 40 })
  code!: string;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  minAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  discountAmount!: string;

  @Column({ type: "varchar", length: 24, default: "all" })
  scope!: MallCouponScope;

  @Column({ type: "int", nullable: true })
  scopeCategoryId!: number | null;

  @Column({ type: "int", nullable: true })
  scopeProductId!: number | null;

  @Column({ type: "int", default: 0 })
  usageLimit!: number;

  @Column({ type: "int", default: 0 })
  perUserLimit!: number;

  @Column({ type: "int", default: 0 })
  usedCount!: number;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "datetime", nullable: true })
  startsAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  endsAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
