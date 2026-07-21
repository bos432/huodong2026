import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("mall_promotion_rate_limits")
@Index("UQ_mall_promotion_rate_window", ["tenant", "action", "dimension", "keyHash", "windowStartedAt"], { unique: true })
@Index("IDX_mall_promotion_rate_expires", ["expiresAt"])
export class MallPromotionRateLimit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @Column({ type: "varchar", length: 32, default: "promotion_order" })
  action!: string;

  @Column({ type: "varchar", length: 16 })
  dimension!: "user" | "device" | "ip";

  @Column({ type: "varchar", length: 64 })
  keyHash!: string;

  @Column({ type: "datetime" })
  windowStartedAt!: Date;

  @Column({ type: "int", default: 0 })
  count!: number;

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
