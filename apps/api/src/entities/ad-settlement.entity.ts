import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdAdvertiser } from "./ad-advertiser.entity";
import { AdContract } from "./ad-contract.entity";
import { Tenant } from "./tenant.entity";

@Entity("ad_settlements")
export class AdSettlement {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => AdAdvertiser, { eager: true, nullable: true, onDelete: "SET NULL" })
  advertiser!: AdAdvertiser | null;

  @ManyToOne(() => AdContract, { eager: true, nullable: true, onDelete: "SET NULL" })
  contract!: AdContract | null;

  @Column({ type: "varchar", length: 80 })
  settlementNo!: string;

  @Column({ type: "date" })
  periodStart!: string;

  @Column({ type: "date" })
  periodEnd!: string;

  @Column({ type: "varchar", length: 40, default: "fixed" })
  billingModel!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  amount!: string;

  @Column({ type: "varchar", length: 40, default: "pending" })
  status!: string;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
