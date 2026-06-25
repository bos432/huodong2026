import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("ad_advertisers")
export class AdAdvertiser {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 160 })
  companyName!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  contactName!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  contactPhone!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  wechat!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  licenseUrl!: string | null;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @Column({ type: "varchar", length: 40, default: "active" })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
