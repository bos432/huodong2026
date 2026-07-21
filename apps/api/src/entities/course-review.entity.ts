import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Course } from "./course.entity";
import { Tenant } from "./tenant.entity";

@Entity("course_reviews")
@Index("IDX_course_review_user_course", ["userId", "courseId"], { unique: true })
@Index("IDX_course_review_course_status", ["courseId", "status"])
export class CourseReview {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column() courseId!: number;
  @ManyToOne(() => Course, { eager: true, onDelete: "CASCADE" }) course!: Course;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @Column({ type: "int" }) rating!: number;
  @Column({ type: "text" }) content!: string;
  @Column({ type: "json", nullable: true }) images!: string[] | null;
  @Column({ type: "varchar", length: 24, default: "pending" }) status!: "pending" | "approved" | "rejected" | "hidden";
  @Column({ type: "text", nullable: true }) reply!: string | null;
  @Column({ type: "datetime", nullable: true }) repliedAt!: Date | null;
  @Column({ type: "int", nullable: true }) repliedByAdminId!: number | null;
  @Column({ type: "varchar", length: 500, nullable: true }) moderationReason!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
