import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { AdminUser } from "./admin-user.entity";
import { Tenant } from "./tenant.entity";

@Entity("activity_recap_versions")
@Index("UQ_activity_recap_versions_activity_version", ["activity", "versionNo"], { unique: true })
@Index("IDX_activity_recap_versions_scope_created", ["tenantScopeKey", "createdAt"])
export class ActivityRecapVersion {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { eager: true, nullable: false, onDelete: "RESTRICT" })
  activity!: Activity;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "RESTRICT" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 40 })
  tenantScopeKey!: string;

  @Column({ type: "int" })
  versionNo!: number;

  @Column({ type: "text" })
  summary!: string;

  @Column({ type: "json" })
  problems!: string[];

  @Column({ type: "json" })
  actionItems!: string[];

  @Column({ type: "json" })
  images!: string[];

  @Column({ type: "json" })
  metricSnapshot!: Record<string, unknown>;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "RESTRICT" })
  createdBy!: AdminUser | null;

  @CreateDateColumn()
  createdAt!: Date;
}
