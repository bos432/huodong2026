import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("course_assessment_answers")
@Index("IDX_course_answer_attempt_question", ["attemptId", "questionId"], { unique: true })
export class CourseAssessmentAnswer {
  @PrimaryGeneratedColumn() id!: number;
  @Column() attemptId!: number;
  @Column() questionId!: number;
  @Column({ type: "json", nullable: true }) answer!: string[] | null;
  @Column({ type: "text", nullable: true }) essayAnswer!: string | null;
  @Column({ type: "boolean", nullable: true }) correct!: boolean | null;
  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 }) score!: string;
  @Column({ type: "text", nullable: true }) feedback!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
