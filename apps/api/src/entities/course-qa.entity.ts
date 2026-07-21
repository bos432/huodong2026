import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Course } from "./course.entity";
import { Tenant } from "./tenant.entity";

@Entity("course_qa")
@Index("IDX_course_qa_course_status", ["courseId", "status"])
export class CourseQa {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column() courseId!: number;
  @Column({ type: "int", nullable: true }) lessonId!: number | null;
  @ManyToOne(() => Course, { eager: true, onDelete: "CASCADE" }) course!: Course;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 200 }) title!: string;
  @Column({ type: "text" }) content!: string;
  @Column({ type: "varchar", length: 24, default: "open" }) status!: "open" | "answered" | "closed" | "hidden";
  @Column({ type: "text", nullable: true }) answer!: string | null;
  @Column({ type: "datetime", nullable: true }) answeredAt!: Date | null;
  @Column({ type: "int", nullable: true }) answeredByAdminId!: number | null;
  @Column({ type: "boolean", default: false }) featured!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
