import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("redemption_codes")
@Index("UQ_redemption_codes_tenant_code", ["tenant", "code"], { unique: true })
export class RedemptionCode {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 64 }) code!: string;
  @Column({ type: "varchar", length: 100 }) name!: string;
  @Column({ type: "varchar", length: 32 }) targetType!: "activity_coupon" | "mall_coupon" | "course_access" | "points";
  @Column({ type: "int", nullable: true }) targetId!: number | null;
  @Column({ type: "int", default: 0 }) points!: number;
  @Column({ type: "int", default: 0 }) usageLimit!: number;
  @Column({ type: "int", default: 1 }) perUserLimit!: number;
  @Column({ type: "int", default: 0 }) usedCount!: number;
  @Column({ type: "boolean", default: true }) enabled!: boolean;
  @Column({ type: "datetime", nullable: true }) startsAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) endsAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
