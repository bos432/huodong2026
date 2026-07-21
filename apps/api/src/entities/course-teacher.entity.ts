import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { Tenant } from "./tenant.entity";

@Entity("course_teachers")
@Index("UQ_course_teachers_admin_user", ["adminUser"], { unique: true })
export class CourseTeacher {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @OneToOne(() => AdminUser, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn()
  adminUser!: AdminUser | null;
  @Column({ type: "varchar", length: 100 }) name!: string;
  @Column({ type: "varchar", length: 500, nullable: true }) avatarUrl!: string | null;
  @Column({ type: "varchar", length: 160, nullable: true }) title!: string | null;
  @Column({ type: "text", nullable: true }) bio!: string | null;
  @Column({ type: "varchar", length: 32, default: "active" }) status!: "active" | "disabled";
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
