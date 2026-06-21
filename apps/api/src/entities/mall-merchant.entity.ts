import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Agent } from "./agent.entity";
import { Tenant } from "./tenant.entity";

export type MallMerchantOwnerType = "tenant" | "agent";
export type MallMerchantPaymentMode = "platform_collect" | "merchant_direct";
export type MallMerchantStatus = "active" | "disabled";

@Entity("mall_merchants")
@Index("IDX_mall_merchants_tenant_status", ["tenant", "status"])
@Index("IDX_mall_merchants_owner", ["ownerType", "tenant", "agent"])
export class MallMerchant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 80, unique: true })
  code!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 16 })
  ownerType!: MallMerchantOwnerType;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => Agent, { eager: true, nullable: true, onDelete: "SET NULL" })
  agent!: Agent | null;

  @Column({ type: "varchar", length: 32, default: "active" })
  status!: MallMerchantStatus;

  @Column({ type: "boolean", default: true })
  mallEnabled!: boolean;

  @Column({ type: "boolean", default: true })
  productAuditRequired!: boolean;

  @Column({ type: "varchar", length: 24, default: "platform_collect" })
  paymentMode!: MallMerchantPaymentMode;

  @Column({ type: "varchar", length: 80, nullable: true })
  region!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  contactName!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  contactPhone!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  logoUrl!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  notice!: string | null;

  @Column({ type: "json", nullable: true })
  settlementConfig!: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
