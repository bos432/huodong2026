import { CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallProduct } from "./mall-product.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("mall_favorites")
@Index("IDX_mall_favorites_unique_user_product", ["tenant", "user", "product"], { unique: true })
export class MallFavorite {
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

  @CreateDateColumn()
  createdAt!: Date;
}
