import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Tenant } from "./tenant.entity";

@Entity("activity_approval_logs")
export class ActivityApprovalLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { eager: true, onDelete: "CASCADE" })
  activity!: Activity;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 40 })
  action!: "create" | "update" | "close" | "submit" | "approve" | "reject";

  @Column({ type: "varchar", length: 100, nullable: true })
  operator!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  fromStatus!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  toStatus!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @Column({ type: "json", nullable: true })
  snapshot!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
