import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallProduct } from "./mall-product.entity";
import { MallSku } from "./mall-sku.entity";
import { Tenant } from "./tenant.entity";

export type MallGroupBuyStatus = "draft" | "active" | "disabled";

@Entity("mall_group_buys")
@Index("IDX_mall_group_buys_tenant_status", ["tenant", "status"])
export class MallGroupBuy {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallProduct, { eager: true, nullable: false, onDelete: "CASCADE" })
  product!: MallProduct;

  @ManyToOne(() => MallSku, { eager: true, nullable: false, onDelete: "CASCADE" })
  sku!: MallSku;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  groupPrice!: string;

  @Column({ type: "int", default: 2 })
  minPeople!: number;

  @Column({ type: "int", default: 0 })
  groupStock!: number;

  @Column({ type: "int", default: 0 })
  lockedStock!: number;

  @Column({ type: "int", default: 0 })
  soldStock!: number;

  @Column({ type: "int", default: 1 })
  perUserLimit!: number;

  @Column({ type: "datetime" })
  startsAt!: Date;

  @Column({ type: "datetime" })
  endsAt!: Date;

  @Column({ type: "varchar", length: 24, default: "draft" })
  status!: MallGroupBuyStatus;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
