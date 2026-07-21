import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("user_learning")
@Index("IDX_user_learning_user_course_lesson", ["userId", "courseId", "lessonId"], { unique: true })
export class UserLearning {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column() courseId!: number;
  @Column() lessonId!: number;
  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 }) progress!: number;
  @Column({ type: "datetime", nullable: true }) completedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) lastRemindedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
