import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Order } from "./order.entity";
import { Refund } from "./refund.entity";
import { CharityFundAccount } from "./charity-fund-account.entity";
import { CharityProjectDisbursement } from "./charity-project-disbursement.entity";
import { CharityProject } from "./charity-project.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";
import type { CredentialTemplateConfig } from "../shared/credential-template";

export type CharityFundDirection = "credit" | "debit";
export type CharityFundTransactionType = "charity_accrual" | "charity_reversal" | "charity_retention" | "project_disbursement" | "manual_adjust";
export type CharityFundSourceType = "activity_order" | "mall_order" | "charity_project" | "manual";

@Entity("charity_fund_transactions")
@Unique(["idempotencyKey"])
export class CharityFundTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CharityFundAccount, { eager: true, nullable: true, onDelete: "SET NULL" })
  account!: CharityFundAccount | null;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  user!: User | null;

  @ManyToOne(() => Order, { eager: true, nullable: true, onDelete: "SET NULL" })
  order!: Order | null;

  @ManyToOne(() => Refund, { eager: true, nullable: true, onDelete: "SET NULL" })
  refund!: Refund | null;

  @ManyToOne(() => CharityProject, { eager: true, nullable: true, onDelete: "SET NULL" })
  project!: CharityProject | null;

  @ManyToOne(() => CharityProjectDisbursement, { eager: true, nullable: true, onDelete: "SET NULL" })
  disbursement!: CharityProjectDisbursement | null;

  @Column({ type: "varchar", length: 16 })
  direction!: CharityFundDirection;

  @Column({ type: "varchar", length: 32 })
  type!: CharityFundTransactionType;

  @Column({ type: "varchar", length: 32, default: "activity_order" })
  sourceType!: CharityFundSourceType;

  @Column({ type: "varchar", length: 180, nullable: true })
  sourceTitle!: string | null;

  @Column({ type: "tinyint", default: 0 })
  retainedOnRefund!: boolean;

  @Column({ type: "tinyint", default: 1 })
  certificateEligible!: boolean;

  @Column({ type: "int", default: 0 })
  certificateTemplateVersion!: number;

  @Column({ type: "json", nullable: true })
  certificateTemplateSnapshot!: CredentialTemplateConfig | null;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: "bigint", default: 0 })
  amountFen!: number;

  @Column({ type: "bigint", default: 0 })
  balanceBeforeFen!: number;

  @Column({ type: "bigint", default: 0 })
  balanceAfterFen!: number;

  @Column({ type: "bigint", default: 0 })
  ledgerSequence!: number;

  @Column({ type: "varchar", length: 64, nullable: true })
  previousHash!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  entryHash!: string | null;

  @Column({ type: "varchar", length: 24, default: "charity_ledger_v2" })
  ledgerVersion!: string;

  @Column({ type: "json", nullable: true })
  businessSnapshot!: Record<string, unknown> | null;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  basisAmount!: string;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  ratePercent!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  operator!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @Column({ type: "varchar", length: 80 })
  idempotencyKey!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
