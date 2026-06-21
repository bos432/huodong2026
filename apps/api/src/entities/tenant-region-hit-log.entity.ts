import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { TenantRegion } from "./tenant-region.entity";

@Entity("tenant_region_hit_logs")
export class TenantRegionHitLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => TenantRegion, { nullable: true, onDelete: "SET NULL" })
  region!: TenantRegion | null;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  latitude!: string;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  longitude!: string;

  @Column({ type: "boolean", default: false })
  matched!: boolean;

  @Column({ type: "int", nullable: true })
  distanceMeters!: number | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  source!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  clientIp!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
