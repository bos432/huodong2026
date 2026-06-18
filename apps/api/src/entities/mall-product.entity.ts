import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallCategory } from "./mall-category.entity";
import { Tenant } from "./tenant.entity";

export type MallProductStatus = "draft" | "published" | "offline";

@Entity("mall_products")
export class MallProduct {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallCategory, { eager: true, nullable: true, onDelete: "SET NULL" })
  category!: MallCategory | null;

  @Index()
  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  coverUrl!: string | null;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  brandName!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  price!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  originalPrice!: string;

  @Column({ type: "varchar", length: 32, default: "draft" })
  status!: MallProductStatus;

  @Column({ type: "boolean", default: false })
  featured!: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  deliveryNote!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  afterSaleNote!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
