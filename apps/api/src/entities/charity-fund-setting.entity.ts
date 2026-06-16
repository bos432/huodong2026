import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

export type CharityAccrualBasis = "paid_amount" | "original_amount" | "manual";

@Entity("charity_fund_settings")
export class CharityFundSetting {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "tinyint", default: 1 })
  enabled!: boolean;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 5 })
  ratePercent!: string;

  @Column({ type: "varchar", length: 32, default: "paid_amount" })
  accrualBasis!: CharityAccrualBasis;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  manualBasisAmount!: string | null;

  @Column({ type: "varchar", length: 80, default: "我的公益贡献" })
  userDisplayName!: string;

  @Column({ type: "varchar", length: 120, default: "公益金来自平台订单收入计提，用户无需额外支付。" })
  publicNote!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
