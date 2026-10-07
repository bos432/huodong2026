import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Tenant } from "./tenant.entity";

@Entity("experience_projects")
export class ExperienceProject {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, onDelete: "CASCADE" }) tenant!: Tenant;
  @ManyToOne(() => Activity, { eager: true, nullable: true, onDelete: "SET NULL" }) activity!: Activity | null;
  @Column({ type: "varchar", length: 160 }) title!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ type: "int", default: 0 }) quota!: number;
  @Column({ type: "int", default: 0 }) approvedCount!: number;
  @Column({ type: "varchar", length: 24, default: "open" }) status!: "draft" | "open" | "closed" | "archived";
  @Column({ type: "datetime", nullable: true }) applyDeadline!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
