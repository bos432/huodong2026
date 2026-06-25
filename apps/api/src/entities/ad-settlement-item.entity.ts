import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdCampaign } from "./ad-campaign.entity";
import { AdSettlement } from "./ad-settlement.entity";

@Entity("ad_settlement_items")
export class AdSettlementItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => AdSettlement, { eager: true, nullable: false, onDelete: "CASCADE" })
  settlement!: AdSettlement;

  @ManyToOne(() => AdCampaign, { eager: true, nullable: true, onDelete: "SET NULL" })
  campaign!: AdCampaign | null;

  @Column({ type: "varchar", length: 180 })
  description!: string;

  @Column({ type: "varchar", length: 40, default: "fixed" })
  billingModel!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  quantity!: string;

  @Column({ type: "decimal", precision: 12, scale: 4, default: 0 })
  unitPrice!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  amount!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
