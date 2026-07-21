import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

export type TenantRegionBoundaryPoint = { lat: number; lng: number };
export type TenantRegionAuthorizationStatus = "pending" | "approved" | "rejected";

@Entity("tenant_regions")
@Index("IDX_tenant_regions_authorization_validity", ["enabled", "authorizationStatus", "validFrom", "validUntil"])
@Index("IDX_tenant_regions_tenant_status", ["tenant", "authorizationStatus", "enabled"])
@Index("IDX_tenant_regions_city_status", ["province", "city", "authorizationStatus", "enabled"])
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

  @Column({ type: "json", nullable: true })
  boundaryPoints!: TenantRegionBoundaryPoint[] | null;

  @Column({ type: "boolean", default: true })
  exclusive!: boolean;

  @Column({ type: "int", default: 0 })
  priority!: number;

  @Column({ type: "varchar", length: 20, default: "approved" })
  authorizationStatus!: TenantRegionAuthorizationStatus;

  @Column({ type: "date", nullable: true })
  validFrom!: string | null;

  @Column({ type: "date", nullable: true })
  validUntil!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  approvalRemark!: string | null;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
