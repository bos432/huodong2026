import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";

@Entity("admin_mall_merchant_access")
@Index("IDX_admin_mall_merchant_unique", ["admin", "merchant"], { unique: true })
export class AdminMallMerchantAccess {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => AdminUser, { eager: true, nullable: false, onDelete: "CASCADE" })
  admin!: AdminUser;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: false, onDelete: "CASCADE" })
  merchant!: MallMerchant;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 40, default: "manager" })
  accessRole!: string;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
