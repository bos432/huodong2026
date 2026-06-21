import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallProduct } from "./mall-product.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("mall_browse_histories")
@Index("IDX_mall_browse_unique_user_product", ["tenant", "user", "product"], { unique: true })
export class MallBrowseHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => MallProduct, { eager: true, nullable: false, onDelete: "CASCADE" })
  product!: MallProduct;

  @Column({ type: "int", default: 1 })
  viewCount!: number;

  @Column({ type: "datetime" })
  lastViewedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
