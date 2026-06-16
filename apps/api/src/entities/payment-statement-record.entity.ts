import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Order } from "./order.entity";
import { Tenant } from "./tenant.entity";

@Entity("payment_statement_records")
@Unique(["provider", "transactionNo"])
export class PaymentStatementRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, { eager: true, nullable: true, onDelete: "SET NULL" })
  order!: Order | null;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 40 })
  provider!: string;

  @Column({ type: "varchar", length: 128 })
  transactionNo!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  orderNo!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 40, nullable: true })
  tradeType!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  providerStatus!: string | null;

  @Column({ type: "datetime", nullable: true })
  tradedAt!: Date | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  batchNo!: string | null;

  @Column({ type: "varchar", length: 24, default: "pending" })
  reconciliationStatus!: string;

  @Column({ type: "varchar", length: 40, nullable: true })
  discrepancyType!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @Column({ type: "json", nullable: true })
  rawPayload!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  importedBy!: string | null;

  @CreateDateColumn()
  importedAt!: Date;
}
