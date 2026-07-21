import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { SupportWorkOrderLog } from "./support-work-order-log.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("support_work_orders")
@Index(["tenantScopeKey", "status", "updatedAt"])
@Index(["tenantScopeKey", "user", "createdAt"])
export class SupportWorkOrder {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "varchar", length: 40, unique: true }) orderNo!: string;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 32, default: "platform" }) tenantScopeKey!: string;
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" }) user!: User | null;
  @Column({ type: "varchar", length: 160 }) title!: string;
  @Column({ type: "text" }) description!: string;
  @Column({ type: "varchar", length: 40, default: "consultation" }) category!: string;
  @Column({ type: "varchar", length: 20, default: "normal" }) priority!: string;
  @Column({ type: "varchar", length: 30, default: "open" }) status!: string;
  @Column({ type: "varchar", length: 60, nullable: true }) businessType!: string | null;
  @Column({ type: "varchar", length: 100, nullable: true }) businessId!: string | null;
  @Column({ type: "json", nullable: true }) businessSnapshot!: Record<string, unknown> | null;
  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" }) assignee!: AdminUser | null;
  @Column({ type: "datetime", nullable: true }) firstResponseAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) dueAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) resolvedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) closedAt!: Date | null;
  @Column({ type: "varchar", length: 500, nullable: true }) resolution!: string | null;
  @OneToMany(() => SupportWorkOrderLog, (log) => log.workOrder) logs!: SupportWorkOrderLog[];
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
