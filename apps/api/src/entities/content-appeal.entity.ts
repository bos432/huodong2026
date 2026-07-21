import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ContentUserSanction } from "./content-user-sanction.entity";
import { Tenant } from "./tenant.entity";

@Entity("content_appeals")
@Index("IDX_content_appeal_tenant_status", ["tenant", "status", "createdAt"])
export class ContentAppeal {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "varchar", length: 160 }) businessKey!: string;
  @Column({ type: "varchar", length: 160, nullable: true }) pendingKey!: string | null;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column() userId!: number;
  @ManyToOne(() => ContentUserSanction, { eager: true, nullable: true, onDelete: "SET NULL" }) sanction!: ContentUserSanction | null;
  @Column({ type: "varchar", length: 40, nullable: true }) targetType!: string | null;
  @Column({ type: "int", nullable: true }) targetId!: number | null;
  @Column({ type: "varchar", length: 2000 }) reason!: string;
  @Column({ type: "json", nullable: true }) evidenceUrls!: string[] | null;
  @Column({ type: "varchar", length: 20, default: "pending" }) status!: "pending" | "approved" | "rejected";
  @Column({ type: "varchar", length: 1000, nullable: true }) handleRemark!: string | null;
  @Column({ type: "int", nullable: true }) handledByAdminId!: number | null;
  @Column({ type: "datetime", nullable: true }) handledAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
