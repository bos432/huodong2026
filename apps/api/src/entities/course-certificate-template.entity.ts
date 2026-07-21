import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Course } from "./course.entity";
import { Tenant } from "./tenant.entity";

@Entity("course_certificate_templates")
@Index("IDX_course_certificate_template_course", ["courseId"], { unique: true })
export class CourseCertificateTemplate {
  @PrimaryGeneratedColumn() id!: number;
  @Column() courseId!: number;
  @ManyToOne(() => Course, { eager: true, onDelete: "CASCADE" }) course!: Course;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 160 }) name!: string;
  @Column({ type: "varchar", length: 500, nullable: true }) backgroundUrl!: string | null;
  @Column({ type: "varchar", length: 160, nullable: true }) issuerName!: string | null;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ type: "int", default: 100 }) completionThreshold!: number;
  @Column({ type: "boolean", default: false }) requireAssessmentPass!: boolean;
  @Column({ type: "boolean", default: true }) enabled!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
