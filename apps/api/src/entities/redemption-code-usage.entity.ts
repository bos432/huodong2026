import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { RedemptionCode } from "./redemption-code.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("redemption_code_usages")
@Unique(["redemptionCode", "user"])
export class RedemptionCodeUsage {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @ManyToOne(() => RedemptionCode, { eager: true, onDelete: "CASCADE" }) redemptionCode!: RedemptionCode;
  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" }) user!: User;
  @Column({ type: "int", default: 1 }) usedCount!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
