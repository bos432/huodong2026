import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("fund_risk_alerts")
export class FundRiskAlert {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Index({ unique: true }) @Column({ type: "varchar", length: 160 }) fingerprint!: string;
  @Index() @Column({ type: "varchar", length: 48 }) type!: string;
  @Column({ type: "varchar", length: 16 }) severity!: string;
  @Index() @Column({ type: "varchar", length: 16, default: "open" }) status!: string;
  @Column({ type: "varchar", length: 120 }) title!: string;
  @Column({ type: "varchar", length: 500 }) message!: string;
  @Column({ type: "varchar", length: 48, nullable: true }) businessType!: string | null;
  @Column({ type: "varchar", length: 100, nullable: true }) businessNo!: string | null;
  @Column({ type: "json", nullable: true }) evidence!: Record<string, unknown> | null;
  @Column({ type: "int", default: 1 }) occurrenceCount!: number;
  @Column({ type: "datetime" }) firstDetectedAt!: Date;
  @Column({ type: "datetime" }) lastDetectedAt!: Date;
  @Column({ type: "varchar", length: 100, nullable: true }) handledBy!: string | null;
  @Column({ type: "datetime", nullable: true }) handledAt!: Date | null;
  @Column({ type: "varchar", length: 500, nullable: true }) handlingRemark!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
