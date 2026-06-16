import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Order } from "./order.entity";
import { Tenant } from "./tenant.entity";

@Entity("payment_callback_logs")
export class PaymentCallbackLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, { eager: true, nullable: true, onDelete: "SET NULL" })
  order!: Order | null;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 40 })
  provider!: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  orderNo!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  transactionNo!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  amount!: string | null;

  @Column({ type: "boolean", nullable: true })
  signatureValid!: boolean | null;

  @Column({ type: "varchar", length: 24, default: "received" })
  resultStatus!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  resultMessage!: string | null;

  @Column({ type: "json" })
  payload!: Record<string, unknown>;

  @Column({ type: "datetime", nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
