import { BeforeInsert, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { yuanToFen } from "../shared/money";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_payment_transactions")
@Unique(["transactionNo"])
export class MallPaymentTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => MallOrder, { eager: true, onDelete: "CASCADE" })
  order!: MallOrder;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @Column({ type: "varchar", length: 128 })
  transactionNo!: string;

  @Column({ type: "varchar", length: 40 })
  provider!: string;

  @Column({ type: "varchar", length: 40 })
  paymentMethod!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;
  @Column({ type: "bigint", default: 0 }) amountFen!: number;
  @Column({ type: "varchar", length: 40, default: "mall" }) businessType!: string;
  @Column({ type: "varchar", length: 80, nullable: true }) businessOrderNo!: string | null;
  @Column({ type: "json", nullable: true }) businessSnapshot!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 24, default: "success" })
  status!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @Column({ type: "varchar", length: 24, default: "matched" })
  reconciliationStatus!: string;

  @Column({ type: "varchar", length: 40, nullable: true })
  discrepancyType!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @BeforeInsert()
  freezeBusinessMoney() {
    this.amountFen = yuanToFen(this.amount);
    this.businessOrderNo ||= this.order?.orderNo || null;
    this.businessSnapshot ||= { transactionNo: this.transactionNo, provider: this.provider, paymentMethod: this.paymentMethod, amount: this.amount, orderNo: this.businessOrderNo, merchantId: this.merchant?.id || null };
  }
}
