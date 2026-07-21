import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { MallSettlement } from "./mall-settlement.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_settlement_events")
@Index("UQ_mall_settlement_event_key", ["eventKey"], { unique: true })
@Index("IDX_mall_settlement_event_settlement", ["settlement", "createdAt"])
export class MallSettlementEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: false, onDelete: "CASCADE" })
  merchant!: MallMerchant;

  @ManyToOne(() => MallSettlement, { eager: true, nullable: false, onDelete: "CASCADE" })
  settlement!: MallSettlement;

  @Column({ type: "varchar", length: 160 })
  eventKey!: string;

  @Column({ type: "varchar", length: 32 })
  action!: "generated" | "adjusted" | "approved" | "rejected" | "paid" | "cancelled";

  @Column({ type: "varchar", length: 32, nullable: true })
  fromStatus!: string | null;

  @Column({ type: "varchar", length: 32 })
  toStatus!: string;

  @Column({ type: "int", nullable: true })
  operatorAdminId!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  operator!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  remark!: string | null;

  @Column({ type: "json", nullable: true })
  snapshot!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
