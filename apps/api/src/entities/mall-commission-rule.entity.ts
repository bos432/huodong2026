import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallProduct } from "./mall-product.entity";
import { MallPromotionCode } from "./mall-promotion-code.entity";
import { Tenant } from "./tenant.entity";

export type MallCommissionRuleScope = "tenant" | "merchant" | "channel" | "product";
export type MallCommissionRuleStatus = "active" | "retired";

@Entity("mall_commission_rules")
@Unique("UQ_mall_commission_rule_version", ["tenant", "ruleKey", "version"])
@Index("IDX_mall_commission_rule_scope", ["tenant", "scopeType", "status", "startsAt", "endsAt"])
export class MallCommissionRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "CASCADE" })
  merchant!: MallMerchant | null;

  @ManyToOne(() => MallProduct, { eager: true, nullable: true, onDelete: "CASCADE" })
  product!: MallProduct | null;

  @ManyToOne(() => MallPromotionCode, { eager: true, nullable: true, onDelete: "CASCADE" })
  promotionCode!: MallPromotionCode | null;

  @Column({ type: "varchar", length: 64 })
  ruleKey!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 16 })
  scopeType!: MallCommissionRuleScope;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "int", default: 0 })
  priority!: number;

  @Column({ type: "int", default: 0 })
  directRateBps!: number;

  @Column({ type: "json", nullable: true })
  agentLevelRatesBps!: number[] | null;

  @Column({ type: "varchar", length: 16, default: "active" })
  status!: MallCommissionRuleStatus;

  @Column({ type: "datetime", nullable: true })
  startsAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  endsAt!: Date | null;

  @Column({ type: "int", nullable: true })
  createdByAdminId!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  createdBy!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
