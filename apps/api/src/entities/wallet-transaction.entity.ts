import { BeforeInsert, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { yuanToFen } from "../shared/money";
import { Order } from "./order.entity";
import { Tenant } from "./tenant.entity";
import { UserWallet } from "./user-wallet.entity";
import { User } from "./user.entity";

export type WalletTransactionDirection = "credit" | "debit";
export type WalletTransactionType = "admin_recharge" | "admin_deduct" | "admin_adjust" | "gift_grant" | "gift_revoke" | "balance_freeze" | "balance_unfreeze" | "balance_pay" | "refund_return";

@Entity("wallet_transactions")
@Unique(["transactionNo"])
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => UserWallet, { eager: true, nullable: false, onDelete: "CASCADE" })
  wallet!: UserWallet;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => Order, { eager: true, nullable: true, onDelete: "SET NULL" })
  order!: Order | null;

  @Column({ type: "varchar", length: 64 })
  transactionNo!: string;

  @Column({ type: "varchar", length: 12 })
  direction!: WalletTransactionDirection;

  @Column({ type: "varchar", length: 32 })
  type!: WalletTransactionType;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;
  @Column({ type: "bigint", default: 0 }) amountFen!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  balanceBefore!: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  balanceAfter!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) frozenBefore!: string;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) frozenAfter!: string;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) giftBefore!: string;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) giftAfter!: string;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) frozenGiftBefore!: string;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) frozenGiftAfter!: string;

  @Column({ type: "varchar", length: 24, default: "success" })
  status!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  operator!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 128, nullable: true })
  idempotencyKey!: string | null;

  @Index()
  @Column({ type: "char", length: 64, nullable: true })
  previousHash!: string | null;

  @Index()
  @Column({ type: "char", length: 64, nullable: true })
  entryHash!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @BeforeInsert()
  freezeAmountInCents() {
    this.amountFen = yuanToFen(this.amount);
  }
}
