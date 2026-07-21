import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("course_lessons")
export class CourseLesson {
  @PrimaryGeneratedColumn() id!: number;
  @Column() chapterId!: number;
  @Column() title!: string;
  @Column({ type: "varchar", length: 500, nullable: true }) videoUrl!: string | null;
  @Column({ type: "varchar", length: 24, default: "video" }) contentType!: "video" | "audio" | "article" | "attachment";
  @Column({ type: "varchar", length: 500, nullable: true }) audioUrl!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) attachmentUrl!: string | null;
  @Column({ type: "varchar", length: 160, nullable: true }) attachmentName!: string | null;
  @Column({ type: "varchar", length: 24, default: "published" }) status!: "draft" | "published";
  @Column({ type: "varchar", length: 20, nullable: true }) duration!: string | null;
  @Column({ default: false }) isFree!: boolean;
  @Column({ default: 0 }) sortOrder!: number;
  @Column({ type: "text", nullable: true }) content!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
