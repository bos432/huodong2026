import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_order_events")
@Unique("UQ_mall_order_events_order_key", ["order", "eventKey"])
@Index("IDX_mall_order_events_tenant_order_time", ["tenant", "order", "occurredAt"])
export class MallOrderEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @Column({ type: "varchar", length: 80 })
  eventKey!: string;

  @Column({ type: "varchar", length: 40 })
  eventType!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  fromStatus!: string | null;

  @Column({ type: "varchar", length: 32 })
  toStatus!: string;

  @Column({ type: "varchar", length: 32 })
  source!: "user" | "admin" | "payment_callback" | "worker" | "system";

  @Column({ type: "varchar", length: 80, nullable: true })
  operator!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @Column({ type: "json", nullable: true })
  detail!: Record<string, unknown> | null;

  @Column({ type: "datetime" })
  occurredAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
