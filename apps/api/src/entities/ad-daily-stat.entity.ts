import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdAdvertiser } from "./ad-advertiser.entity";
import { AdCampaign } from "./ad-campaign.entity";
import { AdContract } from "./ad-contract.entity";
import { Tenant } from "./tenant.entity";

@Entity("ad_daily_stats")
export class AdDailyStat {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => AdAdvertiser, { eager: true, nullable: true, onDelete: "SET NULL" })
  advertiser!: AdAdvertiser | null;

  @ManyToOne(() => AdContract, { eager: true, nullable: true, onDelete: "SET NULL" })
  contract!: AdContract | null;

  @ManyToOne(() => AdCampaign, { eager: true, nullable: true, onDelete: "CASCADE" })
  campaign!: AdCampaign | null;

  @Column({ type: "date" })
  statDate!: string;

  @Column({ type: "varchar", length: 40, default: "custom" })
  source!: string;

  @Column({ type: "varchar", length: 60, default: "banner" })
  format!: string;

  @Column({ type: "varchar", length: 80, default: "home_top_banner" })
  slotKey!: string;

  @Column({ type: "varchar", length: 80, default: "home" })
  pageKey!: string;

  @Column({ type: "varchar", length: 40, default: "h5" })
  platform!: string;

  @Column({ type: "int", default: 0 })
  impressionCount!: number;

  @Column({ type: "int", default: 0 })
  clickCount!: number;

  @Column({ type: "int", default: 0 })
  skipCount!: number;

  @Column({ type: "int", default: 0 })
  closeCount!: number;

  @Column({ type: "int", default: 0 })
  loadCount!: number;

  @Column({ type: "int", default: 0 })
  errorCount!: number;

  @Column({ type: "int", default: 0 })
  rewardCount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  spentAmount!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
