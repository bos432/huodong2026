import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdAdvertiser } from "./ad-advertiser.entity";
import { AdContract } from "./ad-contract.entity";
import { Tenant } from "./tenant.entity";

@Entity("ad_campaigns")
export class AdCampaign {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => AdAdvertiser, { eager: true, nullable: true, onDelete: "SET NULL" })
  advertiser!: AdAdvertiser | null;

  @ManyToOne(() => AdContract, { eager: true, nullable: true, onDelete: "SET NULL" })
  contract!: AdContract | null;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "varchar", length: 220, nullable: true })
  subtitle!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ type: "varchar", length: 40, default: "custom" })
  source!: string;

  @Column({ type: "varchar", length: 60, default: "banner" })
  format!: string;

  @Column({ type: "varchar", length: 80, default: "home_top_banner" })
  slotKey!: string;

  @Column({ type: "varchar", length: 80, default: "home" })
  pageKey!: string;

  @Column({ type: "json", nullable: true })
  platforms!: string[] | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  link!: string | null;

  @Column({ type: "varchar", length: 40, default: "fixed" })
  billingModel!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  fixedFee!: string;

  @Column({ type: "decimal", precision: 12, scale: 4, default: 0 })
  cpmPrice!: string;

  @Column({ type: "decimal", precision: 12, scale: 4, default: 0 })
  cpcPrice!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalBudget!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  dailyBudget!: string;

  @Column({ type: "int", default: 0 })
  impressionLimit!: number;

  @Column({ type: "int", default: 0 })
  clickLimit!: number;

  @Column({ type: "varchar", length: 120, nullable: true })
  officialAdUnitId!: string | null;

  @Column({ type: "varchar", length: 60, nullable: true })
  officialAdType!: string | null;

  @Column({ type: "varchar", length: 40, default: "once_per_day" })
  frequency!: string;

  @Column({ type: "int", default: 0 })
  priority!: number;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "datetime", nullable: true })
  startAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  endAt!: Date | null;

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
