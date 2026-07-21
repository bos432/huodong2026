import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { VolunteerProfile } from "./volunteer-profile.entity";

export type VolunteerTrainingStatus = "pending" | "approved" | "rejected" | "revoked";

@Entity("volunteer_training_records")
@Index("IDX_volunteer_training_profile_status", ["profile", "status", "expiresAt"])
export class VolunteerTrainingRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160 })
  businessKey!: string;

  @ManyToOne(() => VolunteerProfile, { eager: true, nullable: false, onDelete: "CASCADE" })
  profile!: VolunteerProfile;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  provider!: string | null;

  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 })
  trainingHours!: string;

  @Column({ type: "datetime" })
  completedAt!: Date;

  @Column({ type: "datetime", nullable: true })
  expiresAt!: Date | null;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: VolunteerTrainingStatus;

  @Column({ type: "text", nullable: true })
  certificateEncrypted!: string | null;

  @Column({ type: "text", nullable: true })
  reviewRemarkEncrypted!: string | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  reviewedBy!: AdminUser | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  reviewBusinessKey!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
