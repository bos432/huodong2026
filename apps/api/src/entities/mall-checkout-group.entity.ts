import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PaymentMethod } from "../shared/domain";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type MallCheckoutGroupStatus = "pending_payment" | "partial_paid" | "paid" | "completed" | "closed" | "refunded";

@Index("IDX_mall_checkout_groups_client_key", ["tenant", "user", "clientOrderKey"], { unique: true })
@Entity("mall_checkout_groups")
export class MallCheckoutGroup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  groupNo!: string;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  amount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  goodsAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discountAmount!: string;

  @Column({ type: "varchar", length: 24, nullable: true })
  paymentMethod!: PaymentMethod | null;

  @Column({ type: "varchar", length: 32, default: "pending_payment" })
  status!: MallCheckoutGroupStatus;

  @Column({ type: "varchar", length: 80, nullable: true })
  clientOrderKey!: string | null;

  @Column({ type: "json", nullable: true })
  paymentTasks!: Record<string, unknown>[] | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
