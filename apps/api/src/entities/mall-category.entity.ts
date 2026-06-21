import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_categories")
export class MallCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  merchant!: MallMerchant | null;

  @Index()
  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  iconUrl!: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
