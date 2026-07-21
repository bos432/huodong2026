import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_merchant_contracts")
@Index("IDX_mall_merchant_contract_validity", ["merchant", "status", "endsAt"])
export class MallMerchantContract {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, onDelete: "CASCADE" }) tenant!: Tenant;
  @ManyToOne(() => MallMerchant, { eager: true, onDelete: "CASCADE" }) merchant!: MallMerchant;
  @Column({ type: "varchar", length: 100 }) contractNo!: string;
  @Column({ type: "int", default: 1 }) version!: number;
  @Column({ type: "varchar", length: 160 }) name!: string;
  @Column({ type: "varchar", length: 500 }) fileUrl!: string;
  @Column({ type: "date" }) startsAt!: string;
  @Column({ type: "date" }) endsAt!: string;
  @Column({ type: "datetime", nullable: true }) signedAt!: Date | null;
  @Column({ type: "varchar", length: 24, default: "draft" }) status!: "draft" | "active" | "expired" | "terminated";
  @Column({ type: "int", default: 0 }) platformCommissionBps!: number;
  @Column({ type: "int", default: 0 }) serviceFeeBps!: number;
  @Column({ type: "int", default: 30 }) settlementCycleDays!: number;
  @Column({ type: "json", nullable: true }) snapshot!: Record<string, unknown> | null;
  @Column({ type: "varchar", length: 1000, nullable: true }) remark!: string | null;
  @Column({ type: "int", nullable: true }) activatedByAdminId!: number | null;
  @Column({ type: "datetime", nullable: true }) activatedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
