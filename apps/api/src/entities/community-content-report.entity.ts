import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("community_content_reports")
@Index("IDX_community_content_report_tenant_status", ["tenant", "status", "createdAt"])
export class CommunityContentReport {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column() reporterId!: number;
  @Column({ type: "varchar", length: 30 }) targetType!: "post" | "comment";
  @Column() targetId!: number;
  @Column() targetUserId!: number;
  @Column({ type: "varchar", length: 40 }) type!: string;
  @Column({ type: "varchar", length: 1000, nullable: true }) description!: string | null;
  @Column({ type: "varchar", length: 20, default: "pending" }) status!: "pending" | "resolved" | "rejected";
  @Column({ type: "varchar", length: 30, nullable: true }) action!: "none" | "hide" | "sanction" | null;
  @Column({ type: "varchar", length: 1000, nullable: true }) handleRemark!: string | null;
  @Column({ type: "int", nullable: true }) handledByAdminId!: number | null;
  @Column({ type: "datetime", nullable: true }) handledAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
