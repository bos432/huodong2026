import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Agent } from "./agent.entity";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("mall_promotion_codes")
export class MallPromotionCode {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 40 })
  code!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  promoterUser!: User | null;

  @ManyToOne(() => Agent, { eager: true, nullable: true, onDelete: "SET NULL" })
  agent!: Agent | null;

  @Column({ type: "decimal", precision: 8, scale: 4, default: "0.0000" })
  commissionRate!: string;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "int", default: 0 })
  orderCount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: "0.00" })
  orderAmount!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
