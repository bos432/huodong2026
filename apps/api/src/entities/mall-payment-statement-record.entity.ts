import { BeforeInsert, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { yuanToFen } from "../shared/money";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_payment_statement_records")
@Unique(["provider", "accountScope", "transactionNo"])
export class MallPaymentStatementRecord {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" }) tenant!: Tenant;
  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" }) merchant!: MallMerchant | null;
  @ManyToOne(() => MallOrder, { eager: true, nullable: true, onDelete: "SET NULL" }) order!: MallOrder | null;
  @Column({ type: "varchar", length: 40 }) provider!: string;
  @Index() @Column({ type: "varchar", length: 80 }) accountScope!: string;
  @Column({ type: "varchar", length: 128 }) transactionNo!: string;
  @Index() @Column({ type: "varchar", length: 128, nullable: true }) orderNo!: string | null;
  @Column({ type: "decimal", precision: 12, scale: 2 }) amount!: string;
  @Column({ type: "bigint", default: 0 }) amountFen!: number;
  @Column({ type: "varchar", length: 40, nullable: true }) tradeType!: string | null;
  @Column({ type: "varchar", length: 40, nullable: true }) providerStatus!: string | null;
  @Column({ type: "datetime", nullable: true }) tradedAt!: Date | null;
  @Column({ type: "varchar", length: 80, nullable: true }) batchNo!: string | null;
  @Index() @Column({ type: "varchar", length: 24, default: "pending" }) reconciliationStatus!: string;
  @Column({ type: "varchar", length: 40, nullable: true }) discrepancyType!: string | null;
  @Column({ type: "varchar", length: 255, nullable: true }) remark!: string | null;
  @Column({ type: "json", nullable: true }) rawPayload!: Record<string, unknown> | null;
  @Column({ type: "varchar", length: 100, nullable: true }) importedBy!: string | null;
  @Column({ type: "varchar", length: 100, nullable: true }) claimedBy!: string | null;
  @Column({ type: "datetime", nullable: true }) claimedAt!: Date | null;
  @Column({ type: "varchar", length: 100, nullable: true }) resolvedBy!: string | null;
  @Column({ type: "datetime", nullable: true }) resolvedAt!: Date | null;
  @Column({ type: "varchar", length: 500, nullable: true }) resolutionRemark!: string | null;
  @CreateDateColumn() importedAt!: Date;
  @BeforeInsert() freezeMoney() { this.amountFen = yuanToFen(this.amount); }
}
