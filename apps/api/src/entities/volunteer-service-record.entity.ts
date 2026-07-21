import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { User } from "./user.entity";
import { VolunteerProfile } from "./volunteer-profile.entity";
import { VolunteerTaskApplication } from "./volunteer-task-application.entity";
import { VolunteerTask } from "./volunteer-task.entity";

@Entity("volunteer_service_records")
export class VolunteerServiceRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  businessKey!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  applicationRecordKey!: string | null;

  @ManyToOne(() => VolunteerProfile, { eager: true, onDelete: "CASCADE" })
  profile!: VolunteerProfile;

  @ManyToOne(() => VolunteerTask, { eager: true, nullable: true, onDelete: "SET NULL" })
  task!: VolunteerTask | null;

  @ManyToOne(() => VolunteerTaskApplication, { eager: true, nullable: true, onDelete: "SET NULL" })
  application!: VolunteerTaskApplication | null;

  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 })
  hours!: string;

  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 })
  submittedHours!: string;

  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 })
  confirmedHours!: string;

  @Column({ type: "varchar", length: 40, default: "pending_volunteer" })
  status!: "pending_volunteer" | "pending_supervisor" | "confirmed" | "rejected" | "reversed";

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  proofUrl!: string | null;

  @Column({ type: "text", nullable: true })
  proofEncrypted!: string | null;

  @Column({ type: "text", nullable: true })
  feedback!: string | null;

  @Column({ type: "text", nullable: true })
  feedbackEncrypted!: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  volunteerConfirmedBy!: User | null;

  @Column({ type: "datetime", nullable: true })
  volunteerConfirmedAt!: Date | null;

  @Column({ type: "varchar", length: 160, nullable: true, unique: true })
  volunteerConfirmationKey!: string | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  supervisorConfirmedBy!: AdminUser | null;

  @Column({ type: "datetime", nullable: true })
  supervisorConfirmedAt!: Date | null;

  @Column({ type: "varchar", length: 160, nullable: true, unique: true })
  supervisorConfirmationKey!: string | null;

  @Column({ type: "text", nullable: true })
  rejectionReasonEncrypted!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
