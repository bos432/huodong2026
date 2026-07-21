import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { VolunteerBadgeDefinition } from "./volunteer-badge-definition.entity";
import { VolunteerProfile } from "./volunteer-profile.entity";
import { VolunteerServiceRecord } from "./volunteer-service-record.entity";

@Entity("volunteer_badge_awards")
@Index("IDX_volunteer_badge_award_profile", ["profile", "status", "awardedAt"])
export class VolunteerBadgeAward {
  @PrimaryGeneratedColumn() id!: number;
  @Index({ unique: true }) @Column({ type: "varchar", length: 160 }) businessKey!: string;
  @ManyToOne(() => VolunteerBadgeDefinition, { eager: true, nullable: false, onDelete: "RESTRICT" }) definition!: VolunteerBadgeDefinition;
  @ManyToOne(() => VolunteerProfile, { eager: true, nullable: false, onDelete: "CASCADE" }) profile!: VolunteerProfile;
  @ManyToOne(() => VolunteerServiceRecord, { eager: true, nullable: true, onDelete: "SET NULL" }) sourceServiceRecord!: VolunteerServiceRecord | null;
  @Column({ type: "varchar", length: 24, default: "active" }) status!: "active" | "revoked";
  @Column({ type: "datetime" }) awardedAt!: Date;
  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" }) awardedBy!: AdminUser | null;
  @Column({ type: "datetime", nullable: true }) revokedAt!: Date | null;
  @Column({ type: "varchar", length: 120, nullable: true }) revokedBy!: string | null;
  @Index({ unique: true }) @Column({ type: "varchar", length: 160, nullable: true }) revokeBusinessKey!: string | null;
  @Column({ type: "text", nullable: true }) revokeReasonEncrypted!: string | null;
  @CreateDateColumn() createdAt!: Date;
}
