import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Agent } from "./agent.entity";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { MallPromotionCode } from "./mall-promotion-code.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type MallCommissionStatus = "pending" | "void" | "settled";

@Entity("mall_commissions")
@Unique(["order"])
export class MallCommission {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => MallPromotionCode, { eager: true, nullable: true, onDelete: "SET NULL" })
  promotionCode!: MallPromotionCode | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  promoterUser!: User | null;

  @ManyToOne(() => Agent, { eager: true, nullable: true, onDelete: "SET NULL" })
  agent!: Agent | null;

  @Column({ type: "varchar", length: 40 })
  code!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  orderAmount!: string;

  @Column({ type: "decimal", precision: 8, scale: 4 })
  commissionRate!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  commissionAmount!: string;

  @Index()
  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: MallCommissionStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  voidReason!: string | null;

  @Column({ type: "datetime", nullable: true })
  voidedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  settledAt!: Date | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  settledBy!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  settleRemark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
