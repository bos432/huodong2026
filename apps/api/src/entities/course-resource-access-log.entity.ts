import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("course_resource_access_logs")
@Index("IDX_course_resource_access_user_course_created", ["userId", "courseId", "createdAt"])
export class CourseResourceAccessLog {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column() courseId!: number;
  @Column() lessonId!: number;
  @Column({ type: "varchar", length: 24 }) resourceType!: string;
  @Column({ type: "varchar", length: 64, nullable: true }) clientIp!: string | null;
  @Column({ type: "varchar", length: 255, nullable: true }) userAgent!: string | null;
  @CreateDateColumn() createdAt!: Date;
}
