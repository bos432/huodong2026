import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from "typeorm";
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

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  frozenBalance!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalRecharge!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalSpent!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
