import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type SocialProfileStatus = "pending" | "approved" | "rejected";

@Entity("social_profiles")
@Unique("UQ_social_profiles_scope_user", ["tenantScopeKey", "userId"])
@Index("IDX_social_profiles_public", ["tenantScopeKey", "status", "visible", "updatedAt"])
export class SocialProfile {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @JoinColumn({ name: "userId" })
  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" }) user!: User;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 32, default: "platform" }) tenantScopeKey!: string;
  @Column({ type: "varchar", length: 60 }) displayName!: string;
  @Column({ type: "varchar", length: 80, nullable: true }) city!: string | null;
  @Column({ type: "varchar", length: 80, nullable: true }) industry!: string | null;
  @Column({ type: "varchar", length: 100, nullable: true }) roleTitle!: string | null;
  @Column({ type: "varchar", length: 1000 }) introduction!: string;
  @Column({ type: "json", nullable: true }) offers!: string[] | null;
  @Column({ type: "json", nullable: true }) needs!: string[] | null;
  @Column({ type: "varchar", length: 20, default: "pending" }) status!: SocialProfileStatus;
  @Column({ type: "boolean", default: true }) visible!: boolean;
  @Column({ type: "varchar", length: 500, nullable: true }) reviewRemark!: string | null;
  @Column({ type: "datetime", nullable: true }) reviewedAt!: Date | null;
  @Column({ type: "int", nullable: true }) reviewedByAdminId!: number | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
