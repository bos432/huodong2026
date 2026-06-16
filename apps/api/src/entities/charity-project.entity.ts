import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

export type CharityProjectStatus = "fundraising" | "pending_execution" | "executing" | "completed" | "archived";

@Entity("charity_projects")
export class CharityProject {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  targetAmount!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  disbursedAmount!: string;

  @Column({ type: "varchar", length: 32, default: "fundraising" })
  status!: CharityProjectStatus;

  @Column({ type: "varchar", length: 500, nullable: true })
  coverUrl!: string | null;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "datetime", nullable: true })
  executedAt!: Date | null;

  @Column({ type: "tinyint", default: 1 })
  publicVisible!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
