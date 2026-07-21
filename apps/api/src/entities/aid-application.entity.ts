import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type AidApplicationStatus = "submitted" | "supplement_required" | "pending_review" | "approved" | "rejected" | "closed";

@Entity("aid_applications")
export class AidApplication {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  applicationNo!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160 })
  submitBusinessKey!: string;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  assignee!: AdminUser | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  reviewer!: AdminUser | null;

  @Column({ type: "varchar", length: 20 })
  type!: "personal" | "project";

  @Column({ type: "varchar", length: 32, default: "submitted" })
  status!: AidApplicationStatus;

  @Column({ type: "varchar", length: 80 })
  city!: string;

  @Column({ type: "varchar", length: 80 })
  supportCategory!: string;

  @Column({ type: "text" })
  sensitivePayloadEncrypted!: string;

  @Index()
  @Column({ type: "varchar", length: 64 })
  phoneLookupHash!: string;

  @Column({ type: "varchar", length: 40 })
  applicantNameMasked!: string;

  @Column({ type: "varchar", length: 20 })
  phoneMasked!: string;

  @Column({ type: "int", default: 0 })
  materialCount!: number;

  @Column({ type: "varchar", length: 40 })
  consentVersion!: string;

  @Column({ type: "datetime" })
  consentAt!: Date;

  @Column({ type: "text", nullable: true })
  supplementRequestEncrypted!: string | null;

  @Column({ type: "text", nullable: true })
  reviewRemarkEncrypted!: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  reviewBusinessKey!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  closedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
