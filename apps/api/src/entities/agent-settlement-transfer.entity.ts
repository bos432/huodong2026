import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { AgentPaymentAccount } from "./agent-payment-account.entity";
import { AgentSettlement } from "./agent-settlement.entity";
import { Agent } from "./agent.entity";
import { Tenant } from "./tenant.entity";

export type AgentSettlementTransferStatus = "pending" | "processing" | "success" | "failed";
export type AgentSettlementTransferMode = "sandbox" | "real";

@Entity("agent_settlement_transfers")
@Unique(["transferNo"])
export class AgentSettlementTransfer {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => AgentSettlement, { eager: true, onDelete: "CASCADE" })
  settlement!: AgentSettlement;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => Agent, { eager: true, onDelete: "CASCADE" })
  agent!: Agent;

  @ManyToOne(() => AgentPaymentAccount, { eager: true, nullable: true, onDelete: "SET NULL" })
  account!: AgentPaymentAccount | null;

  @Column({ type: "varchar", length: 40 })
  provider!: string;

  @Column({ type: "varchar", length: 16, default: "sandbox" })
  mode!: AgentSettlementTransferMode;

  @Column({ type: "varchar", length: 128 })
  transferNo!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  providerTransferNo!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: AgentSettlementTransferStatus;

  @Column({ type: "varchar", length: 500, nullable: true })
  failureReason!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  requestedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  requestedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  syncedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  completedAt!: Date | null;

  @Column({ type: "int", default: 0 })
  retryCount!: number;

  @Column({ type: "datetime", nullable: true })
  nextQueryAt!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @Column({ type: "json", nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
