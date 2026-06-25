import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdAdvertiser } from "./ad-advertiser.entity";
import { Tenant } from "./tenant.entity";

@Entity("ad_contracts")
export class AdContract {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => AdAdvertiser, { eager: true, nullable: true, onDelete: "SET NULL" })
  advertiser!: AdAdvertiser | null;

  @Column({ type: "varchar", length: 80 })
  contractNo!: string;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "varchar", length: 40, default: "fixed" })
  billingModel!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  amount!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  fixedFee!: string;

  @Column({ type: "decimal", precision: 12, scale: 4, default: 0 })
  cpmPrice!: string;

  @Column({ type: "decimal", precision: 12, scale: 4, default: 0 })
  cpcPrice!: string;

  @Column({ type: "datetime", nullable: true })
  startAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  endAt!: Date | null;

  @Column({ type: "varchar", length: 40, default: "unpaid" })
  paymentStatus!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  attachmentUrl!: string | null;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @Column({ type: "varchar", length: 40, default: "active" })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
