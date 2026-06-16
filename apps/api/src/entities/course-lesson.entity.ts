import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("course_lessons")
export class CourseLesson {
  @PrimaryGeneratedColumn() id!: number;
  @Column() chapterId!: number;
  @Column() title!: string;
  @Column({ type: "varchar", length: 500, nullable: true }) videoUrl!: string | null;
  @Column({ type: "varchar", length: 20, nullable: true }) duration!: string | null;
  @Column({ default: false }) isFree!: boolean;
  @Column({ default: 0 }) sortOrder!: number;
  @Column({ type: "text", nullable: true }) content!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
