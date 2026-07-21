import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { VolunteerProfile } from "./volunteer-profile.entity";
import { VolunteerServiceRecord } from "./volunteer-service-record.entity";

@Entity("volunteer_service_proofs")
export class VolunteerServiceProof {
  @PrimaryGeneratedColumn() id!: number;
  @Index({ unique: true }) @Column({ type: "varchar", length: 80 }) proofNo!: string;
  @Index({ unique: true }) @Column({ type: "varchar", length: 160 }) businessKey!: string;
  @ManyToOne(() => VolunteerProfile, { eager: true, nullable: false, onDelete: "CASCADE" }) profile!: VolunteerProfile;
  @ManyToOne(() => VolunteerServiceRecord, { eager: true, nullable: true, onDelete: "SET NULL" }) serviceRecord!: VolunteerServiceRecord | null;
  @Column({ type: "varchar", length: 160 }) title!: string;
  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 }) hours!: string;
  @Column({ type: "json", nullable: true }) snapshot!: Record<string, unknown> | null;
  @Column({ type: "text", nullable: true }) evidenceEncrypted!: string | null;
  @Column({ type: "varchar", length: 24, default: "active" }) status!: "active" | "revoked";
  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" }) issuer!: AdminUser | null;
  @Column({ type: "datetime", nullable: true }) revokedAt!: Date | null;
  @Column({ type: "varchar", length: 120, nullable: true }) revokedBy!: string | null;
  @Index({ unique: true }) @Column({ type: "varchar", length: 160, nullable: true }) revokeBusinessKey!: string | null;
  @Column({ type: "text", nullable: true }) revokeReasonEncrypted!: string | null;
  @CreateDateColumn() issuedAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
