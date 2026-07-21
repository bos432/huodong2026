import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
@Entity("course_assessment_grants")
@Index("IDX_course_assessment_grant_user", ["assessmentId", "userId"], { unique: true })
export class CourseAssessmentGrant {
  @PrimaryGeneratedColumn() id!: number;
  @Column() assessmentId!: number;
  @Column() userId!: number;
  @Column({ type:"int", default:0 }) additionalAttempts!: number;
  @Column({ type:"datetime", nullable:true }) lateUntil!: Date | null;
  @Column({ type:"varchar", length:500, nullable:true }) reason!: string | null;
  @Column({ type:"int", nullable:true }) grantedByAdminId!: number | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
