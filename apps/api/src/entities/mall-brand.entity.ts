import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("mall_brands")
@Unique("UQ_mall_brand_tenant_code", ["tenant", "code"])
@Index("IDX_mall_brand_tenant_status", ["tenant", "status", "sortOrder"])
export class MallBrand {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, onDelete: "CASCADE" }) tenant!: Tenant;
  @Column({ type: "varchar", length: 80 }) code!: string;
  @Column({ type: "varchar", length: 120 }) name!: string;
  @Column({ type: "varchar", length: 500, nullable: true }) logoUrl!: string | null;
  @Column({ type: "varchar", length: 1000, nullable: true }) description!: string | null;
  @Column({ type: "varchar", length: 24, default: "active" }) status!: "active" | "disabled";
  @Column({ type: "int", default: 0 }) sortOrder!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
