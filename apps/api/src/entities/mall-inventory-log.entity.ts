import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { MallSku } from "./mall-sku.entity";
import { Tenant } from "./tenant.entity";

export type MallInventoryLogType = "lock" | "release" | "deduct" | "return" | "adjust";

@Entity("mall_inventory_logs")
@Index("UQ_mall_inventory_log_tenant_operation", ["tenant", "operationKey"], { unique: true })
export class MallInventoryLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallSku, { eager: true, nullable: false, onDelete: "CASCADE" })
  sku!: MallSku;

  @ManyToOne(() => MallOrder, { eager: true, nullable: true, onDelete: "SET NULL" })
  order!: MallOrder | null;

  @Column({ type: "varchar", length: 24 })
  type!: MallInventoryLogType;

  @Column({ type: "varchar", length: 160 })
  operationKey!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  sourceType!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  sourceId!: string | null;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "int" })
  stockBefore!: number;

  @Column({ type: "int" })
  stockAfter!: number;

  @Column({ type: "int" })
  lockedBefore!: number;

  @Column({ type: "int" })
  lockedAfter!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
