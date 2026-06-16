import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Tenant } from "./tenant.entity";

@Entity("coupons")
export class Coupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 64, unique: true })
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
