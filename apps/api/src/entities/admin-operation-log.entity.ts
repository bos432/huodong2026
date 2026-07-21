import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("admin_operation_logs")
@Index("IDX_admin_operation_logs_tenant_created", ["tenantId", "createdAt"])
@Index("IDX_admin_operation_logs_action_target_created", ["action", "targetType", "createdAt"])
@Index("IDX_admin_operation_logs_admin_created", ["adminId", "createdAt"])
export class AdminOperationLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", nullable: true })
  adminId!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  adminUsername!: string | null;

  @Column({ type: "int", nullable: true })
  tenantId!: number | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  adminRole!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  clientIp!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  requestId!: string | null;

  @Column({ type: "varchar", length: 80 })
  action!: string;

  @Column({ type: "varchar", length: 80 })
  targetType!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  targetId!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  summary!: string | null;

  @Column({ type: "json", nullable: true })
  detail!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
