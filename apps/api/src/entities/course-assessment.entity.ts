import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Course } from "./course.entity";
import { Tenant } from "./tenant.entity";

@Entity("course_assessments")
@Index("IDX_course_assessments_course_status", ["course", "status"])
export class CourseAssessment {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Course, { eager: true, onDelete: "CASCADE" }) course!: Course;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 160 }) title!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ type: "varchar", length: 24, default: "quiz" }) type!: "quiz" | "assignment";
  @Column({ type: "int", default: 60 }) passScore!: number;
  @Column({ type: "int", default: 1 }) maxAttempts!: number;
  @Column({ type: "datetime", nullable: true }) dueAt!: Date | null;
  @Column({ type: "boolean", default: false }) allowLateSubmission!: boolean;
  @Column({ type: "varchar", length: 24, default: "draft" }) status!: "draft" | "published" | "closed";
  @Column({ type: "int", default: 0 }) sortOrder!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
