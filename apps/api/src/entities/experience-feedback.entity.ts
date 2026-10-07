import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { ExperienceApplication } from "./experience-application.entity";
import { ExperienceProject } from "./experience-project.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("experience_feedback")
@Unique("UQ_experience_feedback_application", ["application"])
export class ExperienceFeedback {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, onDelete: "CASCADE" }) tenant!: Tenant;
  @ManyToOne(() => ExperienceProject, { eager: true, onDelete: "CASCADE" }) project!: ExperienceProject;
  @ManyToOne(() => ExperienceApplication, { eager: true, onDelete: "CASCADE" }) application!: ExperienceApplication;
  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" }) user!: User;
  @Column({ type: "tinyint" }) rating!: number;
  @Column({ type: "text" }) content!: string;
  @Column({ type: "varchar", length: 24, default: "pending" }) status!: "pending" | "approved" | "rejected";
  @Column({ type: "text", nullable: true }) reviewRemark!: string | null;
  @Column({ type: "datetime", nullable: true }) reviewedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
}
