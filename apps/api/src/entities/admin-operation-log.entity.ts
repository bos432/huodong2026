import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("admin_operation_logs")
export class AdminOperationLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", nullable: true })
  adminId!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  adminUsername!: string | null;

  @Column({ type: "int", nullable: true })
  tenantId!: number | null;

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
