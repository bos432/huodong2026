import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type MallMerchantApplicationStatus = "draft" | "pending" | "approved" | "rejected" | "withdrawn";

@Entity("mall_merchant_applications")
@Index("IDX_mall_merchant_application_tenant_status", ["tenant", "status", "createdAt"])
export class MallMerchantApplication {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, onDelete: "CASCADE" }) tenant!: Tenant;
  @Column() applicantUserId!: number;
  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" }) @JoinColumn({ name: "applicantUserId" }) applicant!: User;
  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" }) merchant!: MallMerchant | null;
  @Column({ type: "varchar", length: 120 }) desiredName!: string;
  @Column({ type: "varchar", length: 160 }) legalName!: string;
  @Column({ type: "varchar", length: 40 }) unifiedSocialCreditCode!: string;
  @Column({ type: "varchar", length: 80 }) legalRepresentative!: string;
  @Column({ type: "varchar", length: 100 }) contactName!: string;
  @Column({ type: "varchar", length: 40 }) contactPhone!: string;
  @Column({ type: "varchar", length: 120, nullable: true }) region!: string | null;
  @Column({ type: "varchar", length: 500 }) businessLicenseUrl!: string;
  @Column({ type: "json", nullable: true }) qualificationFiles!: Array<{ type: string; name: string; url: string; number?: string; validUntil?: string }> | null;
  @Column({ type: "varchar", length: 24, default: "pending" }) status!: MallMerchantApplicationStatus;
  @Column({ type: "varchar", length: 1000, nullable: true }) applyRemark!: string | null;
  @Column({ type: "varchar", length: 1000, nullable: true }) reviewRemark!: string | null;
  @Column({ type: "datetime", nullable: true }) submittedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) reviewedAt!: Date | null;
  @Column({ type: "int", nullable: true }) reviewedByAdminId!: number | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
