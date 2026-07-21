import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("charity_fund_accounts")
export class CharityFundAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 80 })
  scopeKey!: string;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "bigint", default: 0 })
  balanceFen!: number;

  @Column({ type: "bigint", default: 0 })
  reservedFen!: number;

  @Column({ type: "bigint", default: 0 })
  totalCreditFen!: number;

  @Column({ type: "bigint", default: 0 })
  totalDebitFen!: number;

  @Column({ type: "varchar", length: 64, nullable: true })
  ledgerHeadHash!: string | null;

  @Column({ type: "bigint", default: 0 })
  ledgerSequence!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
