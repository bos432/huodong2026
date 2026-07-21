import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

export type MemberPointEventType = "activity_order_paid" | "mall_order_paid" | "activity_check_in" | "activity_review";
export type MemberPointCalculationMode = "fixed" | "amount_ratio";
export type MemberPointGrowthMode = "same_as_points" | "fixed" | "none";

@Entity("member_point_rules")
@Unique(["tenantScopeKey", "eventType"])
export class MemberPointRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" })
  tenant!: Tenant | null;

  @Index()
  @Column({ type: "varchar", length: 32, default: "platform" })
  tenantScopeKey!: string;

  @ManyToOne(() => MemberPointRule, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "templateRuleId" })
  templateRule!: MemberPointRule | null;

  @Column({ type: "varchar", length: 40 })
  eventType!: MemberPointEventType;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "varchar", length: 24, default: "fixed" })
  calculationMode!: MemberPointCalculationMode;

  @Column({ type: "int", default: 0 })
  fixedPoints!: number;

  @Column({ type: "int", default: 100 })
  amountFenPerPoint!: number;

  @Column({ type: "varchar", length: 24, default: "same_as_points" })
  growthMode!: MemberPointGrowthMode;

  @Column({ type: "int", default: 0 })
  fixedGrowth!: number;

  @Column({ type: "int", nullable: true })
  validityDays!: number | null;

  @Column({ type: "int", default: 1 })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
