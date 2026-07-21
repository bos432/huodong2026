import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { MallOrderItem } from "./mall-order-item.entity";
import { MallOrder } from "./mall-order.entity";
import { MallRefund } from "./mall-refund.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_refund_items")
@Unique("UQ_mall_refund_items_refund_order_item", ["refund", "orderItem"])
@Index("IDX_mall_refund_items_order_item", ["order", "orderItem"])
export class MallRefundItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallRefund, { eager: true, nullable: false, onDelete: "CASCADE" })
  refund!: MallRefund;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => MallOrderItem, { eager: true, nullable: false, onDelete: "CASCADE" })
  orderItem!: MallOrderItem;

  @Column({ type: "int" })
  requestedQuantity!: number;

  @Column({ type: "int", default: 0 })
  approvedQuantity!: number;

  @Column({ type: "int", default: 0 })
  receivedQuantity!: number;

  @Column({ type: "int", default: 0 })
  stockRestoredQuantity!: number;

  @Column({ type: "bigint", default: 0 })
  refundableAmountFen!: number;

  @Column({ type: "bigint", default: 0 })
  refundedAmountFen!: number;

  @Column({ type: "json" })
  itemSnapshot!: Record<string, unknown>;
}
