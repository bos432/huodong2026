import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";
import { MallMerchant } from "./mall-merchant.entity";

@Entity("mall_promotion_risk_events")
@Index("IDX_mall_promotion_risk_scope_created", ["tenant", "merchant", "createdAt"])
@Index("IDX_mall_promotion_risk_outcome_created", ["outcome", "createdAt"])
export class MallPromotionRiskEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  user!: User | null;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @Column({ type: "varchar", length: 40 })
  action!: string;

  @Column({ type: "varchar", length: 24, nullable: true })
  promotionType!: "flash_sale" | "group_buy" | "promotion_code" | "coupon" | null;

  @Column({ type: "int", nullable: true })
  promotionId!: number | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  deviceHash!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  ipHash!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  requestId!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  clientOrderKey!: string | null;

  @Column({ type: "varchar", length: 16 })
  outcome!: "allowed" | "review" | "blocked";

  @Column({ type: "varchar", length: 48, nullable: true })
  ruleCode!: string | null;

  @Column({ type: "varchar", length: 16, default: "info" })
  severity!: "info" | "medium" | "high" | "critical";

  @Column({ type: "varchar", length: 500, nullable: true })
  reason!: string | null;

  @Column({ type: "json", nullable: true })
  detail!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
