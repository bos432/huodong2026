import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrderItem } from "./mall-order-item.entity";
import { MallOrder } from "./mall-order.entity";
import { MallShipment } from "./mall-shipment.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_shipment_items")
@Unique("UQ_mall_shipment_items_package_item", ["shipment", "orderItem"])
@Index("IDX_mall_shipment_items_order_item", ["order", "orderItem"])
export class MallShipmentItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => MallShipment, { eager: true, nullable: false, onDelete: "CASCADE" })
  shipment!: MallShipment;

  @ManyToOne(() => MallOrderItem, { eager: true, nullable: false, onDelete: "CASCADE" })
  orderItem!: MallOrderItem;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "json" })
  itemSnapshot!: Record<string, unknown>;
}
