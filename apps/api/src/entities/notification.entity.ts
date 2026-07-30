import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { User } from "./user.entity";
import { Tenant } from "./tenant.entity";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 40, default: "site" })
  channel!: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  scene!: string | null;

  @ManyToOne(() => Tenant, { nullable: true, eager: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 32, default: "platform" }) tenantScopeKey!: string;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 20, default: "sent" })
  status!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  provider!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  providerMessageId!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  errorMessage!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true }) suppressedReason!: string | null;
  @Column({ type: "json", nullable: true }) variablesSnapshot!: Record<string, string> | null;

  @Column({ type: "varchar", length: 120, nullable: true }) providerTemplateId!: string | null;
  @Column({ type: "int", nullable: true }) templateVersion!: number | null;
  @Column({ type: "json", nullable: true }) deliveryOptions!: Record<string, unknown> | null;

  @Column({ type: "int", default: 0 })
  retryCount!: number;

  @Column({ type: "datetime", nullable: true })
  sentAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  failedAt!: Date | null;

  @ManyToOne(() => User, { nullable: true, eager: true })
  user!: User | null;

  @ManyToOne(() => Activity, { nullable: true, eager: true })
  activity!: Activity | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
