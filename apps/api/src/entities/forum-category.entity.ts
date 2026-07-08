import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

export type ForumCategoryPostPermission = "user" | "admin";
export type ForumCategoryAuditMode = "pre" | "post" | "closed";

@Entity("forum_categories")
export class ForumCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description!: string | null;

  @Column({ default: 0 })
  sortOrder!: number;

  @Column({ type: "tinyint", default: 1 })
  enabled!: boolean;

  @Column({ type: "varchar", length: 20, default: "user" })
  postPermission!: ForumCategoryPostPermission;

  @Column({ type: "varchar", length: 20, default: "pre" })
  auditMode!: ForumCategoryAuditMode;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
