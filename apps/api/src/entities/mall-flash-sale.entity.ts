import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallProduct } from "./mall-product.entity";
import { MallSku } from "./mall-sku.entity";
import { Tenant } from "./tenant.entity";

export type MallFlashSaleStatus = "draft" | "active" | "disabled";

@Entity("mall_flash_sales")
@Index("IDX_mall_flash_sales_tenant_status", ["tenant", "status"])
export class MallFlashSale {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallProduct, { eager: true, nullable: false, onDelete: "CASCADE" })
  product!: MallProduct;

  @ManyToOne(() => MallSku, { eager: true, nullable: false, onDelete: "CASCADE" })
  sku!: MallSku;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  salePrice!: string;

  @Column({ type: "int", default: 0 })
  saleStock!: number;

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
  status!: MallFlashSaleStatus;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
