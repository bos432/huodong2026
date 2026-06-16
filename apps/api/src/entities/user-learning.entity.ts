import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("user_learning")
export class UserLearning {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column() courseId!: number;
  @Column() lessonId!: number;
  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 }) progress!: number;
  @Column({ nullable: true }) completedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
