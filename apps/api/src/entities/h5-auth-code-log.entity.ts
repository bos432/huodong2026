import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("h5_auth_code_logs")
export class H5AuthCodeLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 32 })
  phone!: string;

  @Index()
  @Column({ type: "varchar", length: 64, nullable: true })
  clientIp!: string | null;

  @Column({ type: "varchar", length: 20 })
  mode!: string;

  @Index()
  @Column({ type: "varchar", length: 24 })
  status!: "sent" | "failed" | "rate_limited";

  @Column({ type: "varchar", length: 80, nullable: true })
  provider!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  providerMessageId!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  message!: string | null;

  @Column({ type: "datetime", nullable: true })
  expiresAt!: Date | null;

  @Index()
  @CreateDateColumn()
  createdAt!: Date;
}
