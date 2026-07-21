import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_merchant_qualifications")
@Index("IDX_mall_merchant_qualification_validity", ["merchant", "status", "validUntil"])
export class MallMerchantQualification {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, onDelete: "CASCADE" }) tenant!: Tenant;
  @ManyToOne(() => MallMerchant, { eager: true, onDelete: "CASCADE" }) merchant!: MallMerchant;
  @Column({ type: "varchar", length: 40 }) type!: string;
  @Column({ type: "varchar", length: 120 }) name!: string;
  @Column({ type: "varchar", length: 120, nullable: true }) certificateNo!: string | null;
  @Column({ type: "json" }) fileUrls!: string[];
  @Column({ type: "date", nullable: true }) validFrom!: string | null;
  @Column({ type: "date", nullable: true }) validUntil!: string | null;
  @Column({ type: "varchar", length: 24, default: "pending" }) status!: "pending" | "approved" | "rejected" | "expired";
  @Column({ type: "varchar", length: 1000, nullable: true }) reviewRemark!: string | null;
  @Column({ type: "int", nullable: true }) reviewedByAdminId!: number | null;
  @Column({ type: "datetime", nullable: true }) reviewedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
