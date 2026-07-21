import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("course_assessment_attempts")
@Index("IDX_course_attempt_user_assessment_no", ["userId", "assessmentId", "attemptNo"], { unique: true })
export class CourseAssessmentAttempt {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column() courseId!: number;
  @Column() assessmentId!: number;
  @Column() attemptNo!: number;
  @Column({ type: "varchar", length: 24, default: "in_progress" }) status!: "in_progress" | "pending_review" | "passed" | "failed" | "returned";
  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 }) objectiveScore!: string;
  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 }) manualScore!: string;
  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 }) totalScore!: string;
  @Column({ type: "datetime", nullable: true }) submittedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) reviewedAt!: Date | null;
  @Column({ type: "int", nullable: true }) reviewedByAdminId!: number | null;
  @Column({ type: "text", nullable: true }) reviewRemark!: string | null;
  @Column({ type: "boolean", default: false }) lateSubmission!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
