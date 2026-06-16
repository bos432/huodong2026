import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("courses")
export class Course {
  @PrimaryGeneratedColumn() id!: number;
  @Column() title!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) coverUrl!: string | null;
  @Column({ type: "varchar", length: 100, nullable: true }) teacherName!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) teacherAvatar!: string | null;
  @Column({ nullable: true }) categoryId!: number | null;
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 }) price!: number;
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 }) originalPrice!: number;
  @Column({ type: "decimal", precision: 2, scale: 1, default: 0 }) rating!: number;
  @Column({ default: 0 }) reviewCount!: number;
  @Column({ default: 0 }) hotCount!: number;
  @Column({ type: "varchar", length: 50, default: "draft" }) status!: string;
  @Column({ type: "simple-json", nullable: true }) tags!: string[] | null;
  @ManyToOne(() => Tenant, { nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @Column({ default: 0 }) sortOrder!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
