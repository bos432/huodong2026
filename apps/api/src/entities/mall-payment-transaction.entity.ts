import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
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

  @Column({ type: "varchar", length: 128 })
  transactionNo!: string;

  @Column({ type: "varchar", length: 40 })
  provider!: string;

  @Column({ type: "varchar", length: 40 })
  paymentMethod!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

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
}
