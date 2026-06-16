import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PaymentMethod } from "../shared/domain";
import { Agent } from "./agent.entity";
import { Tenant } from "./tenant.entity";

@Entity("agent_payment_accounts")
export class AgentPaymentAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Agent, { eager: true, onDelete: "CASCADE" })
  agent!: Agent;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "enum", enum: PaymentMethod })
  provider!: PaymentMethod;

  @Column({ type: "varchar", length: 120, nullable: true })
  merchantName!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  merchantNo!: string | null;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "json", nullable: true })
  config!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
