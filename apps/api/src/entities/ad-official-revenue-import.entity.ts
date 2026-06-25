import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("ad_official_revenue_imports")
export class AdOfficialRevenueImport {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "date" })
  importDate!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  revenueAmount!: string;

  @Column({ type: "int", default: 0 })
  impressionCount!: number;

  @Column({ type: "int", default: 0 })
  clickCount!: number;

  @Column({ type: "decimal", precision: 12, scale: 4, default: 0 })
  ecpm!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  fileUrl!: string | null;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
