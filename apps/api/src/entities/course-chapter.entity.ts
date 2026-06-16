import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Course } from "./course.entity";

@Entity("course_chapters")
export class CourseChapter {
  @PrimaryGeneratedColumn() id!: number;
  @Column() courseId!: number;
  @Column() title!: string;
  @Column({ default: 0 }) sortOrder!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
