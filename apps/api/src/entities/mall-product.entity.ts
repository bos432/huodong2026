import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallCategory } from "./mall-category.entity";
import { MallBrand } from "./mall-brand.entity";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";

export type MallProductStatus = "draft" | "pending_review" | "published" | "offline";

@Entity("mall_products")
export class MallProduct {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallCategory, { eager: true, nullable: true, onDelete: "SET NULL" })
  category!: MallCategory | null;

  @ManyToOne(() => MallCategory, { eager: true, nullable: true, onDelete: "SET NULL" })
  platformCategory!: MallCategory | null;

  @ManyToOne(() => MallBrand, { eager: true, nullable: true, onDelete: "SET NULL" })
  brand!: MallBrand | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  productCode!: string | null;

  @Index()
  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  coverUrl!: string | null;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  brandName!: string | null;

  @Column({ type: "json", nullable: true })
  galleryUrls!: string[] | null;

  @Column({ type: "json", nullable: true })
  detailBlocks!: Array<Record<string, unknown>> | null;

  @Column({ type: "json", nullable: true })
  attributes!: Record<string, string> | null;

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

  @Column({ type: "int", default: 1 })
  contentVersion!: number;

  @Column({ type: "varchar", length: 1000, nullable: true })
  reviewRemark!: string | null;

  @Column({ type: "datetime", nullable: true })
  submittedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "int", nullable: true })
  reviewedByAdminId!: number | null;

  @Column({ type: "json", nullable: true })
  publishedSnapshot!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
