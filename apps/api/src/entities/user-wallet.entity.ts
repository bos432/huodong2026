import { BeforeInsert, BeforeUpdate, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from "typeorm";
import { yuanToFen } from "../shared/money";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("user_wallets")
@Unique(["user", "tenantScopeKey"])
export class UserWallet {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Index()
  @Column({ type: "varchar", length: 32, default: "platform" })
  tenantScopeKey!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  availableBalance!: string;
  @Column({ type: "bigint", default: 0 }) availableBalanceFen!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  frozenBalance!: string;
  @Column({ type: "bigint", default: 0 }) frozenBalanceFen!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) giftBalance!: string;
  @Column({ type: "bigint", default: 0 }) giftBalanceFen!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) frozenGiftBalance!: string;
  @Column({ type: "bigint", default: 0 }) frozenGiftBalanceFen!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalRecharge!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalSpent!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  syncMoneyInCents() {
    this.availableBalanceFen = yuanToFen(this.availableBalance || 0);
    this.frozenBalanceFen = yuanToFen(this.frozenBalance || 0);
    this.giftBalanceFen = yuanToFen(this.giftBalance || 0);
    this.frozenGiftBalanceFen = yuanToFen(this.frozenGiftBalance || 0);
  }
}
