import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MallFlashSale } from "./mall-flash-sale.entity";
import { MallGroupBuy } from "./mall-group-buy.entity";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { MallProduct } from "./mall-product.entity";
import { MallSku } from "./mall-sku.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_order_items")
export class MallOrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => MallProduct, { eager: true, nullable: false, onDelete: "CASCADE" })
  product!: MallProduct;

  @ManyToOne(() => MallSku, { eager: true, nullable: false, onDelete: "CASCADE" })
  sku!: MallSku;

  @ManyToOne(() => MallFlashSale, { eager: true, nullable: true, onDelete: "SET NULL" })
  flashSale!: MallFlashSale | null;

  @ManyToOne(() => MallGroupBuy, { eager: true, nullable: true, onDelete: "SET NULL" })
  groupBuy!: MallGroupBuy | null;

  @Column({ type: "varchar", length: 160 })
  productTitle!: string;

  @Column({ type: "varchar", length: 120 })
  skuName!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  coverUrl!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: string;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalAmount!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
