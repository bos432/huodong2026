import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { CharityProject } from "./charity-project.entity";
import { Tenant } from "./tenant.entity";

@Entity("charity_project_disbursements")
export class CharityProjectDisbursement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160 })
  businessKey!: string;

  @ManyToOne(() => CharityProject, { eager: true, onDelete: "CASCADE" })
  project!: CharityProject;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  operator!: AdminUser | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  requestedBy!: AdminUser | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  reviewedBy!: AdminUser | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  paidBy!: AdminUser | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  cancelledBy!: AdminUser | null;

  @Column({ type: "int", default: 1 })
  stageNo!: number;

  @Column({ type: "varchar", length: 24, default: "pending_review" })
  status!: "pending_review" | "approved" | "paid" | "rejected" | "cancelled";

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: "bigint", default: 0 })
  amountFen!: number;

  @Column({ type: "varchar", length: 500, nullable: true })
  proofUrl!: string | null;

  @Column({ type: "tinyint", default: 1 })
  publicVisible!: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  reviewRemark!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  reviewBusinessKey!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  paidReference!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  paidRemark!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  payBusinessKey!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  paidAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  cancelledAt!: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  cancelRemark!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  cancelBusinessKey!: string | null;

  @Column({ type: "json", nullable: true })
  requestSnapshot!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
