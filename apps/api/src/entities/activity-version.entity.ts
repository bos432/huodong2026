import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Tenant } from "./tenant.entity";

@Entity("activity_versions")
@Index("IDX_activity_versions_activity_version", ["activity", "versionNo"], { unique: true })
@Index("IDX_activity_versions_tenant_created", ["tenant", "createdAt"])
export class ActivityVersion {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Activity, { eager: true, nullable: false, onDelete: "CASCADE" }) activity!: Activity;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @Column({ type: "int" }) versionNo!: number;
  @Column({ type: "varchar", length: 24, default: "manual_save" }) source!: string;
  @Column({ type: "json" }) snapshot!: Record<string, unknown>;
  @Column({ type: "varchar", length: 80, nullable: true }) createdBy!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) remark!: string | null;
  @CreateDateColumn() createdAt!: Date;
}
