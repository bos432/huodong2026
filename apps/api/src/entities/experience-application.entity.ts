import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { ExperienceProject } from "./experience-project.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("experience_applications")
@Unique("UQ_experience_application_user_project", ["project", "user"])
export class ExperienceApplication {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, onDelete: "CASCADE" }) tenant!: Tenant;
  @ManyToOne(() => ExperienceProject, { eager: true, onDelete: "CASCADE" }) project!: ExperienceProject;
  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" }) user!: User;
  @Column({ type: "text", nullable: true }) reason!: string | null;
  @Column({ type: "varchar", length: 24, default: "pending" }) status!: "pending" | "approved" | "rejected" | "feedback_submitted";
  @Column({ type: "text", nullable: true }) reviewRemark!: string | null;
  @Column({ type: "datetime", nullable: true }) reviewedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
