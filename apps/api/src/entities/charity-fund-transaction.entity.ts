import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Order } from "./order.entity";
import { Refund } from "./refund.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type CharityFundDirection = "credit" | "debit";
export type CharityFundTransactionType = "charity_accrual" | "charity_reversal" | "project_disbursement" | "manual_adjust";

@Entity("charity_fund_transactions")
@Unique(["idempotencyKey"])
export class CharityFundTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  user!: User | null;

  @ManyToOne(() => Order, { eager: true, nullable: true, onDelete: "SET NULL" })
  order!: Order | null;

  @ManyToOne(() => Refund, { eager: true, nullable: true, onDelete: "SET NULL" })
  refund!: Refund | null;

  @Column({ type: "varchar", length: 16 })
  direction!: CharityFundDirection;

  @Column({ type: "varchar", length: 32 })
  type!: CharityFundTransactionType;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

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
