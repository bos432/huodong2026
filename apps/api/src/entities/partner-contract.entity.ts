import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { AmbassadorApplication } from "./ambassador-application.entity";

export type PartnerContractStatus = "draft" | "pending_review" | "active" | "rejected" | "expired" | "terminated";
export type PartnerCooperationType = "tenant" | "merchant" | "tenant_and_merchant";

@Entity("partner_contracts")
@Index("UQ_partner_contract_application_version", ["application", "contractVersion"], { unique: true })
@Index("IDX_partner_contract_status_expiry", ["status", "endsAt"])
export class PartnerContract {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 80 })
  contractNo!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160 })
  businessKey!: string;

  @ManyToOne(() => AmbassadorApplication, { eager: true, nullable: false, onDelete: "CASCADE" })
  application!: AmbassadorApplication;

  @Column({ type: "int" })
  contractVersion!: number;

  @Column({ type: "varchar", length: 32 })
  cooperationType!: PartnerCooperationType;

  @Column({ type: "varchar", length: 24, default: "draft" })
  status!: PartnerContractStatus;

  @Column({ type: "datetime" })
  startsAt!: Date;

  @Column({ type: "datetime" })
  endsAt!: Date;

  @Column({ type: "datetime", nullable: true })
  signedAt!: Date | null;

  @Column({ type: "text", nullable: true })
  termsEncrypted!: string | null;

  @Column({ type: "text", nullable: true })
  documentReferenceEncrypted!: string | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  createdBy!: AdminUser | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  reviewedBy!: AdminUser | null;

  @Column({ type: "varchar", length: 160, nullable: true, unique: true })
  reviewBusinessKey!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  terminationBusinessKey!: string | null;

  @Column({ type: "text", nullable: true })
  reviewRemarkEncrypted!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  terminatedAt!: Date | null;

  @Column({ type: "json", nullable: true })
  snapshot!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
