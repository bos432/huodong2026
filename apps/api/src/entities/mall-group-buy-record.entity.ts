import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallGroupBuy } from "./mall-group-buy.entity";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { MallProduct } from "./mall-product.entity";
import { MallSku } from "./mall-sku.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type MallGroupBuyRecordStatus = "pending" | "paid" | "closed" | "refunded";
export type MallGroupBuyTeamStatus = "forming" | "success" | "failed";

@Entity("mall_group_buy_records")
@Index("IDX_mall_group_buy_records_tenant_status", ["tenant", "status"])
@Index("IDX_mall_group_buy_records_group_buy", ["groupBuy"])
@Index("IDX_mall_group_buy_records_team", ["teamNo"])
export class MallGroupBuyRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallGroupBuy, { eager: true, nullable: false, onDelete: "CASCADE" })
  groupBuy!: MallGroupBuy;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => MallProduct, { eager: true, nullable: false, onDelete: "CASCADE" })
  product!: MallProduct;

  @ManyToOne(() => MallSku, { eager: true, nullable: false, onDelete: "CASCADE" })
  sku!: MallSku;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  groupPrice!: string;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 64 })
  teamNo!: string;

  @Column({ type: "varchar", length: 24, default: "forming" })
  teamStatus!: MallGroupBuyTeamStatus;

  @Column({ type: "int", default: 2 })
  minPeople!: number;

  @Column({ type: "int", default: 0 })
  paidPeople!: number;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: MallGroupBuyRecordStatus;

  @Column({ type: "datetime", nullable: true })
  paidAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  closedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  refundedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
