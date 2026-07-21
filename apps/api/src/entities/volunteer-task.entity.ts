import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { CharityProject } from "./charity-project.entity";
import { Tenant } from "./tenant.entity";

export type VolunteerTaskStatus = "draft" | "open" | "closed" | "completed" | "archived";

@Entity("volunteer_tasks")
@Index("IDX_volunteer_task_recruitment", ["status", "recruitmentStartsAt", "recruitmentEndsAt"])
export class VolunteerTask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64, nullable: true })
  taskNo!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  businessKey!: string | null;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => CharityProject, { eager: true, nullable: true, onDelete: "SET NULL" })
  project!: CharityProject | null;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "varchar", length: 40 })
  type!: string;

  @Column({ type: "varchar", length: 80 })
  city!: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  address!: string | null;

  @Column({ type: "datetime", nullable: true })
  startAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  endAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  recruitmentStartsAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  recruitmentEndsAt!: Date | null;

  @Column({ type: "int", default: 1 })
  quota!: number;

  @Column({ type: "boolean", default: true })
  waitlistEnabled!: boolean;

  @Column({ type: "json", nullable: true })
  requiredSkills!: string[] | null;

  @Column({ type: "boolean", default: false })
  qualificationRequired!: boolean;

  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 })
  minimumTrainingHours!: string;

  @Column({ type: "int", default: 24 })
  cancellationDeadlineHours!: number;

  @Column({ type: "int", default: 60 })
  checkInOpensMinutesBefore!: number;

  @Column({ type: "int", default: 120 })
  checkOutClosesMinutesAfter!: number;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  latitude!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  longitude!: string | null;

  @Column({ type: "varchar", length: 24, default: "open" })
  status!: VolunteerTaskStatus;

  @Column({ type: "text", nullable: true })
  requirement!: string | null;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
