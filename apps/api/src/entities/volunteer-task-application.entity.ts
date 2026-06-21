import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { VolunteerProfile } from "./volunteer-profile.entity";
import { VolunteerTask } from "./volunteer-task.entity";

export type VolunteerTaskApplicationStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";

@Entity("volunteer_task_applications")
export class VolunteerTaskApplication {
  @PrimaryGeneratedColumn()
  id!: number;

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

  @Column({ type: "varchar", length: 80 })
  city!: string;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: VolunteerTaskApplicationStatus;

  @Column({ type: "text", nullable: true })
  message!: string | null;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
