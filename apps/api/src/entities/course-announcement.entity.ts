import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Course } from "./course.entity";
import { Tenant } from "./tenant.entity";

@Entity("course_announcements")
@Index("IDX_course_announcement_course_publish", ["courseId", "status", "publishAt"])
export class CourseAnnouncement {
  @PrimaryGeneratedColumn() id!: number;
  @Column() courseId!: number;
  @ManyToOne(() => Course, { eager: true, onDelete: "CASCADE" }) course!: Course;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 200 }) title!: string;
  @Column({ type: "text" }) content!: string;
  @Column({ type: "varchar", length: 24, default: "draft" }) status!: "draft" | "published" | "cancelled";
  @Column({ type: "datetime", nullable: true }) publishAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) expiresAt!: Date | null;
  @Column({ type: "boolean", default: false }) notifyLearners!: boolean;
  @Column({ type: "datetime", nullable: true }) notifiedAt!: Date | null;
  @Column({ type: "int", nullable: true }) createdByAdminId!: number | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
