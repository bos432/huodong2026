import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("tenant_regions")
export class TenantRegion {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @Column({ type: "varchar", length: 80, nullable: true })
  province!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  city!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  district!: string | null;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  latitude!: string;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  longitude!: string;

  @Column({ type: "int", default: 5000 })
  radiusMeters!: number;

  @Column({ type: "boolean", default: true })
  exclusive!: boolean;

  @Column({ type: "int", default: 0 })
  priority!: number;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
