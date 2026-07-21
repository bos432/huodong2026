import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Tenant } from "./tenant.entity";

@Entity("coupons")
@Index("UQ_coupons_tenant_code", ["tenant", "code"], { unique: true })
export class Coupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 64 })
  code!: string;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 20, default: "fixed" })
  discountType!: "fixed" | "percent";

  @Column({ type: "decimal", precision: 10, scale: 2 })
  discountValue!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  minAmount!: string;

  @Column({ type: "int", nullable: true })
  usageLimit!: number | null;

  @Column({ type: "int", default: 0 })
  usedCount!: number;

  @Column({ type: "varchar", length: 24, default: "code" }) claimMode!: "code" | "claim";
  @Column({ type: "int", default: 1 }) perUserLimit!: number;
  @Column({ type: "int", default: 0 }) claimedCount!: number;

  @ManyToOne(() => Activity, { eager: true, nullable: true, onDelete: "CASCADE" })
  activity!: Activity | null;

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
