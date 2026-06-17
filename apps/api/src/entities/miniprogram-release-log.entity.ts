import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("miniprogram_release_logs")
export class MiniprogramReleaseLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 40 })
  action!: string;

  @Column({ type: "varchar", length: 40 })
  status!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  appId!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  version!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  qrCodeUrl!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  auditId!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  errorMessage!: string | null;

  @Column({ type: "json", nullable: true })
  detail!: Record<string, unknown> | null;

  @Column({ type: "int", nullable: true })
  adminId!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  adminUsername!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
