import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { MallOrderItem } from "./mall-order-item.entity";
import { MallProduct } from "./mall-product.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type MallMembershipPurchaseStatus = "active" | "revoked";

@Entity("mall_membership_purchases")
@Unique("UQ_mall_membership_purchase_order_item", ["orderItem"])
@Index("IDX_mall_membership_purchase_user_merchant_status", ["tenant", "user", "merchant", "status", "expiresAt"])
export class MallMembershipPurchase {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => MallOrderItem, { eager: true, nullable: false, onDelete: "CASCADE" })
  orderItem!: MallOrderItem;

  @ManyToOne(() => MallProduct, { eager: true, nullable: true, onDelete: "SET NULL" })
  product!: MallProduct | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: string;

  @Column({ type: "int" })
  validityDays!: number;

  @Column({ type: "datetime" })
  startsAt!: Date;

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @Column({ type: "varchar", length: 16, default: "active" })
  status!: MallMembershipPurchaseStatus;

  @Column({ type: "datetime", nullable: true })
  revokedAt!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  revokeReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
