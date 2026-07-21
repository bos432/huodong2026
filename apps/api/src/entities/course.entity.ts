import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { CourseTeacher } from "./course-teacher.entity";
import { MemberLevel } from "./member-level.entity";

@Entity("courses")
export class Course {
  @PrimaryGeneratedColumn() id!: number;
  @Column() title!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) coverUrl!: string | null;
  @Column({ type: "varchar", length: 100, nullable: true }) teacherName!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) teacherAvatar!: string | null;
  @ManyToOne(() => CourseTeacher, { eager: true, nullable: true, onDelete: "SET NULL" }) teacher!: CourseTeacher | null;
  @Column({ type: "int", nullable: true }) categoryId!: number | null;
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 }) price!: number;
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 }) originalPrice!: number;
  @Column({ type: "varchar", length: 24, default: "price" }) accessMode!: "price" | "member" | "redeem";
  @ManyToOne(() => MemberLevel, { eager: true, nullable: true, onDelete: "SET NULL" }) requiredMemberLevel!: MemberLevel | null;
  @Column({ type: "int", default: 100 }) completionThreshold!: number;
  @Column({ type: "decimal", precision: 2, scale: 1, default: 0 }) rating!: number;
  @Column({ default: 0 }) reviewCount!: number;
  @Column({ default: 0 }) hotCount!: number;
  @Column({ type: "varchar", length: 50, default: "draft" }) status!: string;
  @Column({ type: "simple-json", nullable: true }) tags!: string[] | null;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @Column({ default: 0 }) sortOrder!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
