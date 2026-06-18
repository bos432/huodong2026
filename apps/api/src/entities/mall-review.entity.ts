import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallOrderItem } from "./mall-order-item.entity";
import { MallOrder } from "./mall-order.entity";
import { MallProduct } from "./mall-product.entity";
import { MallSku } from "./mall-sku.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type MallReviewStatus = "pending" | "approved" | "rejected";

@Entity("mall_reviews")
export class MallReview {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => MallOrder, { eager: true, nullable: false, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => MallOrderItem, { eager: true, nullable: false, onDelete: "CASCADE" })
  orderItem!: MallOrderItem;

  @ManyToOne(() => MallProduct, { eager: true, nullable: false, onDelete: "CASCADE" })
  product!: MallProduct;

  @ManyToOne(() => MallSku, { eager: true, nullable: false, onDelete: "CASCADE" })
  sku!: MallSku;

  @Column({ type: "tinyint", default: 5 })
  rating!: number;

  @Column({ type: "varchar", length: 500 })
  content!: string;

  @Column({ type: "json", nullable: true })
  images!: string[] | null;

  @Index()
  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: MallReviewStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  reviewRemark!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  merchantReply!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  repliedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  repliedAt!: Date | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  reviewedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
