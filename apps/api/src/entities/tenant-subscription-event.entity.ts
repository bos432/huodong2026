import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { Tenant } from "./tenant.entity";

@Entity("tenant_subscription_events")
@Index("IDX_tenant_subscription_events_tenant_created", ["tenant", "createdAt"])
@Index("IDX_tenant_subscription_events_action_created", ["action", "createdAt"])
export class TenantSubscriptionEvent {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" }) tenant!: Tenant;
  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" }) operator!: AdminUser | null;
  @Column({ type: "varchar", length: 24 }) action!: "renew" | "upgrade" | "downgrade" | "extend" | "suspend" | "restore";
  @Column({ type: "varchar", length: 32, nullable: true }) fromPlan!: string | null;
  @Column({ type: "varchar", length: 32, nullable: true }) toPlan!: string | null;
  @Column({ type: "date", nullable: true }) fromExpiresAt!: string | null;
  @Column({ type: "date", nullable: true }) toExpiresAt!: string | null;
  @Column({ type: "json", nullable: true }) beforeState!: Record<string, unknown> | null;
  @Column({ type: "json", nullable: true }) afterState!: Record<string, unknown> | null;
  @Column({ type: "varchar", length: 500, nullable: true }) remark!: string | null;
  @CreateDateColumn() createdAt!: Date;
}
