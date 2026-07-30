import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("notification_templates")
export class NotificationTemplate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 40, default: "site" })
  channel!: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  scene!: string | null;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "varchar", length: 120, nullable: true })
  providerTemplateId!: string | null;

  @Column({ type: "varchar", length: 20, default: "draft" })
  approvalStatus!: "draft" | "pending" | "approved" | "rejected" | "retired";

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "json", nullable: true })
  dataKeys!: Record<string, string> | null;

  @Column({ type: "varchar", length: 240, nullable: true })
  page!: string | null;

  @Column({ type: "json", nullable: true })
  versionHistory!: Array<Record<string, unknown>> | null;

  @ManyToOne(() => Tenant, { nullable: true, eager: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
