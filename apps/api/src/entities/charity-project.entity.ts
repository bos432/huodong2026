import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { Tenant } from "./tenant.entity";

export type CharityProjectStatus = "draft" | "pending_review" | "rejected" | "approved" | "fundraising" | "pending_execution" | "executing" | "pending_acceptance" | "completed" | "archived";

@Entity("charity_projects")
export class CharityProject {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  projectNo!: string;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  applicant!: AdminUser | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  reviewer!: AdminUser | null;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  targetAmount!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  disbursedAmount!: string;

  @Column({ type: "varchar", length: 32, default: "draft" })
  status!: CharityProjectStatus;

  @Column({ type: "varchar", length: 160, nullable: true })
  submitBusinessKey!: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  reviewBusinessKey!: string | null;

  @Column({ type: "datetime", nullable: true })
  submittedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  reviewRemark!: string | null;

  @Column({ type: "json", nullable: true })
  applicationSnapshot!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  coverUrl!: string | null;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "datetime", nullable: true })
  executedAt!: Date | null;

  @Column({ type: "tinyint", default: 1 })
  publicVisible!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
