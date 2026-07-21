import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallSku } from "./mall-sku.entity";
import { Tenant } from "./tenant.entity";

export type MallInventoryAnomalyStatus = "open" | "resolved" | "ignored";

@Entity("mall_inventory_anomalies")
@Index("UQ_mall_inventory_anomaly_fingerprint", ["fingerprint"], { unique: true })
@Index("IDX_mall_inventory_anomaly_scope_status", ["tenant", "status", "lastDetectedAt"])
export class MallInventoryAnomaly {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallSku, { eager: true, nullable: true, onDelete: "SET NULL" })
  sku!: MallSku | null;

  @Column({ type: "varchar", length: 160 })
  fingerprint!: string;

  @Column({ type: "varchar", length: 48 })
  type!: string;

  @Column({ type: "varchar", length: 16, default: "high" })
  severity!: string;

  @Column({ type: "varchar", length: 16, default: "open" })
  status!: MallInventoryAnomalyStatus;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "varchar", length: 1000 })
  message!: string;

  @Column({ type: "varchar", length: 32 })
  sourceType!: string;

  @Column({ type: "varchar", length: 100 })
  sourceId!: string;

  @Column({ type: "json", nullable: true })
  expectedState!: Record<string, unknown> | null;

  @Column({ type: "json", nullable: true })
  actualState!: Record<string, unknown> | null;

  @Column({ type: "int", default: 1 })
  occurrenceCount!: number;

  @Column({ type: "datetime" })
  firstDetectedAt!: Date;

  @Column({ type: "datetime" })
  lastDetectedAt!: Date;

  @Column({ type: "int", nullable: true })
  resolvedByAdminId!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  resolvedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  resolutionRemark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
