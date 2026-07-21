import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { Tenant } from "./tenant.entity";

export type MemberBehaviorTagRunStatus = "running" | "completed" | "failed";

@Entity("member_behavior_tag_runs")
@Index(["tenantScopeKey", "operatorScopeKey", "idempotencyKey"], { unique: true })
@Index(["tenantScopeKey", "createdAt"])
export class MemberBehaviorTagRun {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 64 }) tenantScopeKey!: string;
  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" }) operatorAdmin!: AdminUser | null;
  @Column({ type: "varchar", length: 100 }) operatorScopeKey!: string;
  @Column({ type: "varchar", length: 100 }) idempotencyKey!: string;
  @Index({ unique: true }) @Column({ type: "varchar", length: 64 }) batchKey!: string;
  @Column({ type: "varchar", length: 20, default: "running" }) status!: MemberBehaviorTagRunStatus;
  @Column({ type: "int", default: 0 }) profileCount!: number;
  @Column({ type: "int", default: 0 }) createdCount!: number;
  @Column({ type: "int", default: 0 }) deletedCount!: number;
  @Column({ type: "int", default: 0 }) retainedCount!: number;
  @Column({ type: "json" }) definitionsSnapshot!: Array<Record<string, unknown>>;
  @Column({ type: "varchar", length: 1000, nullable: true }) errorMessage!: string | null;
  @Column({ type: "datetime", nullable: true }) startedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) completedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
}
