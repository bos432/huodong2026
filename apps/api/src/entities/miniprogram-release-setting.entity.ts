import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("miniprogram_release_settings")
export class MiniprogramReleaseSetting {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 80 })
  appId!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  appSecret!: string | null;

  @Column({ type: "text", nullable: true })
  privateKey!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  version!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  projectPath!: string | null;

  @Column({ type: "json", nullable: true })
  auditItem!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
