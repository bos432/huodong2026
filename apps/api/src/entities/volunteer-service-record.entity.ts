import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { VolunteerProfile } from "./volunteer-profile.entity";
import { VolunteerTaskApplication } from "./volunteer-task-application.entity";
import { VolunteerTask } from "./volunteer-task.entity";

@Entity("volunteer_service_records")
export class VolunteerServiceRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => VolunteerProfile, { eager: true, onDelete: "CASCADE" })
  profile!: VolunteerProfile;

  @ManyToOne(() => VolunteerTask, { eager: true, nullable: true, onDelete: "SET NULL" })
  task!: VolunteerTask | null;

  @ManyToOne(() => VolunteerTaskApplication, { eager: true, nullable: true, onDelete: "SET NULL" })
  application!: VolunteerTaskApplication | null;

  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 })
  hours!: string;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  proofUrl!: string | null;

  @Column({ type: "text", nullable: true })
  feedback!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
