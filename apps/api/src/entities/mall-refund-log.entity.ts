import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallOrder } from "./mall-order.entity";
import { MallRefund } from "./mall-refund.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_refund_logs")
export class MallRefundLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => MallRefund, { eager: true, nullable: false, onDelete: "CASCADE" })
  refund!: MallRefund;

  @ManyToOne(() => MallOrder, { eager: true, nullable: true, onDelete: "SET NULL" })
  order!: MallOrder | null;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @Column({ type: "varchar", length: 40 })
  provider!: string;

  @Column({ type: "varchar", length: 40 })
  action!: string;

  @Column({ type: "varchar", length: 40 })
  status!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  providerRefundNo!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  message!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  operator!: string | null;

  @Column({ type: "json", nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
