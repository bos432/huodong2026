import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { MallOrder } from "./mall-order.entity";
import { MallShipment } from "./mall-shipment.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_shipment_tracking_events")
@Unique("UQ_mall_shipment_tracking_event_key", ["shipment", "eventKey"])
@Index("IDX_mall_shipment_tracking_order_time", ["order", "eventAt"])
export class MallShipmentTrackingEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => MallShipment, { eager: true, nullable: false, onDelete: "CASCADE" })
  shipment!: MallShipment;

  @Column({ type: "varchar", length: 80 })
  eventKey!: string;

  @Column({ type: "varchar", length: 32 })
  status!: string;

  @Column({ type: "varchar", length: 255 })
  description!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  location!: string | null;

  @Column({ type: "varchar", length: 32 })
  source!: string;

  @Column({ type: "json", nullable: true })
  rawPayload!: Record<string, unknown> | null;

  @Column({ type: "datetime" })
  eventAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
