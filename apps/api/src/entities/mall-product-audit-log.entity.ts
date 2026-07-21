import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallProduct } from "./mall-product.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_product_audit_logs")
@Index("IDX_mall_product_audit_product_time", ["product", "createdAt"])
export class MallProductAuditLog {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, onDelete: "CASCADE" }) tenant!: Tenant;
  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" }) merchant!: MallMerchant | null;
  @ManyToOne(() => MallProduct, { eager: true, onDelete: "CASCADE" }) product!: MallProduct;
  @Column({ type: "varchar", length: 32 }) action!: "submit" | "approve" | "reject" | "resubmit" | "offline";
  @Column({ type: "varchar", length: 32 }) fromStatus!: string;
  @Column({ type: "varchar", length: 32 }) toStatus!: string;
  @Column({ type: "varchar", length: 1000, nullable: true }) remark!: string | null;
  @Column({ type: "json" }) snapshot!: Record<string, unknown>;
  @Column({ type: "int", nullable: true }) operatorAdminId!: number | null;
  @Column({ type: "varchar", length: 100, nullable: true }) operatorName!: string | null;
  @CreateDateColumn() createdAt!: Date;
}
