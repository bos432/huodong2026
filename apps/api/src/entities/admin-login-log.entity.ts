import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("admin_login_logs")
export class AdminLoginLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 100 })
  username!: string;

  @Column({ type: "int", nullable: true })
  adminId!: number | null;

  @Index()
  @Column({ type: "int", nullable: true })
  tenantId!: number | null;

  @Index()
  @Column({ type: "varchar", length: 64, nullable: true })
  clientIp!: string | null;

  @Index()
  @Column({ type: "varchar", length: 24 })
  status!: "success" | "failed" | "rate_limited";

  @Column({ type: "varchar", length: 80, nullable: true })
  failureReason!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent!: string | null;

  @Index()
  @CreateDateColumn()
  createdAt!: Date;
}
