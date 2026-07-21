import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { User } from "./user.entity";
import { VolunteerProfile } from "./volunteer-profile.entity";
import { VolunteerTask } from "./volunteer-task.entity";

export type VolunteerTaskApplicationStatus = "pending" | "admitted" | "waitlisted" | "rejected" | "cancelled" | "replaced" | "checked_in" | "completed";

@Entity("volunteer_task_applications")
@Index("IDX_volunteer_task_application_queue", ["task", "status", "createdAt"])
export class VolunteerTaskApplication {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  businessKey!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  applicationIdentityKey!: string | null;

  @ManyToOne(() => VolunteerTask, { eager: true, onDelete: "CASCADE" })
  task!: VolunteerTask;

  @ManyToOne(() => VolunteerProfile, { eager: true, nullable: true, onDelete: "SET NULL" })
  profile!: VolunteerProfile | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  user!: User | null;

  @Column({ type: "varchar", length: 40 })
  name!: string;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phoneMasked!: string | null;

  @Index()
  @Column({ type: "varchar", length: 64, nullable: true })
  phoneLookupHash!: string | null;

  @Column({ type: "varchar", length: 80 })
  city!: string;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: VolunteerTaskApplicationStatus;

  @Column({ type: "text", nullable: true })
  message!: string | null;

  @Column({ type: "text", nullable: true })
  messageEncrypted!: string | null;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @Column({ type: "text", nullable: true })
  remarkEncrypted!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  lastActionBusinessKey!: string | null;

  @Column({ type: "int", nullable: true })
  waitlistPosition!: number | null;

  @Column({ type: "datetime", nullable: true })
  admittedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  cancelledAt!: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  cancellationReason!: string | null;

  @ManyToOne(() => VolunteerTaskApplication, { eager: true, nullable: true, onDelete: "SET NULL" })
  replacedBy!: VolunteerTaskApplication | null;

  @Column({ type: "datetime", nullable: true })
  checkedInAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
