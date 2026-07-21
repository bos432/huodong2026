import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { User } from "./user.entity";
import { VolunteerTaskApplication } from "./volunteer-task-application.entity";

export type VolunteerAttendanceAction = "check_in" | "check_out";

@Entity("volunteer_attendance_records")
@Index("UQ_volunteer_attendance_application_action", ["application", "action"], { unique: true })
export class VolunteerAttendanceRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160 })
  businessKey!: string;

  @ManyToOne(() => VolunteerTaskApplication, { eager: true, nullable: false, onDelete: "CASCADE" })
  application!: VolunteerTaskApplication;

  @Column({ type: "varchar", length: 24 })
  action!: VolunteerAttendanceAction;

  @Column({ type: "varchar", length: 24 })
  method!: "signed_token" | "manual";

  @Column({ type: "varchar", length: 80, nullable: true })
  tokenNonce!: string | null;

  @Column({ type: "datetime" })
  occurredAt!: Date;

  @Column({ type: "json", nullable: true })
  locationSnapshot!: { latitude?: number; longitude?: number; accuracy?: number } | null;

  @Column({ type: "text", nullable: true })
  evidenceEncrypted!: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  recordedByUser!: User | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  recordedByAdmin!: AdminUser | null;

  @Column({ type: "varchar", length: 24, default: "valid" })
  status!: "valid" | "reversed";

  @Column({ type: "text", nullable: true })
  reversalReasonEncrypted!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
