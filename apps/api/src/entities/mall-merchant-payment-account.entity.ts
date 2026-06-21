import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PaymentMethod } from "../shared/domain";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_merchant_payment_accounts")
@Index("IDX_mall_merchant_payment_accounts_provider", ["merchant", "provider"])
export class MallMerchantPaymentAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: false, onDelete: "CASCADE" })
  merchant!: MallMerchant;

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
