import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("mall_logistics_companies")
@Index("IDX_mall_logistics_tenant_name", ["tenant", "name"], { unique: true })
export class MallLogisticsCompany {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "varchar", length: 40, nullable: true })
  code!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  servicePhone!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  trackingUrl!: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
