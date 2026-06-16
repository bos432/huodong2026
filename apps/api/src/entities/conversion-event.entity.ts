import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { ActivityChannel } from "./activity-channel.entity";
import { Order } from "./order.entity";
import { Registration } from "./registration.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type ConversionEventType = "view" | "share_visit" | "register" | "pay" | "check_in" | "review" | "cancel" | "refund";

@Entity("conversion_events")
export class ConversionEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => Activity, { eager: true, nullable: true, onDelete: "CASCADE" })
  activity!: Activity | null;

  @ManyToOne(() => ActivityChannel, { eager: true, nullable: true, onDelete: "SET NULL" })
  channel!: ActivityChannel | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  user!: User | null;

  @ManyToOne(() => Registration, { eager: true, nullable: true, onDelete: "SET NULL" })
  registration!: Registration | null;

  @ManyToOne(() => Order, { eager: true, nullable: true, onDelete: "SET NULL" })
  order!: Order | null;

  @Index()
  @Column({ type: "varchar", length: 32 })
  type!: ConversionEventType;

  @Column({ type: "varchar", length: 80, nullable: true })
  source!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  idempotencyKey!: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  amount!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  clientIp!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent!: string | null;

  @Column({ type: "json", nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
