import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { VolunteerServiceRecord } from "./volunteer-service-record.entity";
import type { CredentialTemplateConfig } from "../shared/credential-template";

export type CertificateTemplateKey = "volunteer_service" | "charity_ambassador" | "city_builder" | "course_completion";
export type CertificateStatus = "active" | "revoked";

@Entity("certificates")
export class Certificate {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column({ type: "int", nullable: true }) tenantId!: number | null;
  @Column({ type: "int", nullable: true }) courseId!: number | null;
  @Column({ type: "int", nullable: true }) courseTemplateId!: number | null;
  @Column() name!: string;
  @Column({ type: "varchar", length: 80, nullable: true, unique: true }) certificateNo!: string | null;
  @Column({ type: "varchar", length: 160, nullable: true, unique: true }) issueBusinessKey!: string | null;
  @Column({ type: "int", default: 1 }) certificateVersion!: number;
  @Column({ type: "int", default: 0 }) templateVersion!: number;
  @Column({ type: "json", nullable: true }) templateSnapshot!: CredentialTemplateConfig | null;
  @Column({ type: "varchar", length: 40, default: "volunteer_service" }) templateKey!: CertificateTemplateKey;
  @Column({ type: "varchar", length: 80, nullable: true }) holderName!: string | null;
  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 }) serviceHours!: string;
  @Column({ type: "varchar", length: 24, nullable: true }) level!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) imageUrl!: string | null;
  @Column({ type: "int", nullable: true }) threshold!: number | null;
  @Column({ type: "json", nullable: true }) businessSnapshot!: Record<string, unknown> | null;
  @ManyToOne(() => VolunteerServiceRecord, { eager: true, nullable: true, onDelete: "SET NULL" })
  serviceRecord!: VolunteerServiceRecord | null;
  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  issuer!: AdminUser | null;
  @Column({ type: "varchar", length: 24, default: "active" }) status!: CertificateStatus;
  @Column({ type: "datetime", nullable: true }) revokedAt!: Date | null;
  @Column({ type: "varchar", length: 120, nullable: true }) revokedBy!: string | null;
  @Column({ type: "text", nullable: true }) revokeReason!: string | null;
  @Column({ type: "text", nullable: true }) revokeReasonEncrypted!: string | null;
  @CreateDateColumn() issuedAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
