import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Agent } from "./agent.entity";
import { Tenant } from "./tenant.entity";

export type AgentSettlementStatus = "draft" | "pending_review" | "approved" | "paid" | "rejected" | "cancelled";

@Entity("agent_settlements")
@Unique(["settlementNo"])
export class AgentSettlement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 128 })
  settlementNo!: string;

  @ManyToOne(() => Agent, { eager: true, onDelete: "CASCADE" })
  agent!: Agent;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "datetime" })
  periodStart!: Date;

  @Column({ type: "datetime" })
  periodEnd!: Date;

  @Column({ type: "int", default: 0 })
  transactionCount!: number;

  @Column({ type: "int", default: 0 })
  refundCount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  grossAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  refundAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  netAmount!: string;

  @Column({ type: "decimal", precision: 8, scale: 4, default: "0.0000" })
  commissionRate!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: "0.00" })
  commissionAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  payableAmount!: string;

  @Column({ type: "varchar", length: 24, default: "draft" })
  status!: AgentSettlementStatus;

  @Column({ type: "varchar", length: 100, nullable: true })
  generatedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  submittedAt!: Date | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  reviewedBy!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  reviewRemark!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  paidBy!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  paidReference!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  paidProofUrl!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  paidRemark!: string | null;

  @Column({ type: "datetime", nullable: true })
  paidAt!: Date | null;

  @Column({ type: "json", nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
