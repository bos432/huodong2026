import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("community_activities")
@Index("IDX_community_activities_tenantId", ["tenant"])
export class CommunityActivity {
  @PrimaryGeneratedColumn() id!: number;
  @Column() title!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ type: "datetime", nullable: true }) startTime!: Date | null;
  @Column({ type: "datetime", nullable: true }) endTime!: Date | null;
  @Column({ type: "varchar", length: 24, default: "open" }) joinMode!: "open" | "approval" | "invite";
  @Column({ type: "int", nullable: true }) memberLimit!: number | null;
  @Column({ type: "varchar", length: 64, nullable: true }) inviteCode!: string | null;
  @Column({ type: "varchar", length: 200, nullable: true }) location!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) coverUrl!: string | null;
  @Column({ default: 0 }) registeredCount!: number;
  @Column({ type: "varchar", length: 30, default: "draft" }) status!: string;
  @Column({ default: 0 }) sortOrder!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
