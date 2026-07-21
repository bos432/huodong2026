import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("course_questions")
@Index("IDX_course_questions_assessment_sort", ["assessmentId", "sortOrder"])
export class CourseQuestion {
  @PrimaryGeneratedColumn() id!: number;
  @Column() assessmentId!: number;
  @Column({ type: "varchar", length: 24 }) type!: "single" | "multiple" | "boolean" | "essay";
  @Column({ type: "text" }) stem!: string;
  @Column({ type: "json", nullable: true }) options!: Array<{ key: string; text: string }> | null;
  @Column({ type: "json", nullable: true }) correctAnswer!: string[] | null;
  @Column({ type: "text", nullable: true }) explanation!: string | null;
  @Column({ type: "decimal", precision: 8, scale: 2, default: 10 }) score!: string;
  @Column({ type: "int", default: 0 }) sortOrder!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
