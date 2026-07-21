import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { MallRefund } from "./mall-refund.entity";
import { Tenant } from "./tenant.entity";

export type MallShipmentStatus = "shipped" | "delivered" | "cancelled";

@Entity("mall_shipments")
@Index("UQ_mall_shipments_shipment_no", ["shipmentNo"], { unique: true })
@Index("IDX_mall_shipments_order_status_time", ["order", "status", "shippedAt"])
@Unique("UQ_mall_shipments_order_business_key", ["order", "businessKey"])
export class MallShipment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => MallRefund, { eager: true, nullable: true, onDelete: "SET NULL" })
  refund!: MallRefund | null;

  @Column({ type: "varchar", length: 64 })
  shipmentNo!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  businessKey!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  expressCompany!: string | null;

  @Column({ type: "varchar", length: 100 })
  expressNo!: string;

  @Column({ type: "varchar", length: 24, default: "shipped" })
  status!: MallShipmentStatus;

  @Column({ type: "varchar", length: 24, default: "order" })
  shipmentType!: "order" | "exchange";

  @Column({ type: "varchar", length: 80, nullable: true })
  createdBy!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @Column({ type: "datetime" })
  shippedAt!: Date;

  @Column({ type: "datetime", nullable: true })
  deliveredAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
