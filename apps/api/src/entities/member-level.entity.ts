import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, RelationId, Unique, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("member_levels")
@Unique(["tenantScopeKey", "name"])
@Index("IDX_member_levels_scope_enabled_growth", ["tenantScopeKey", "enabled", "minGrowth"])
export class MemberLevel {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 32, default: "platform" })
  tenantScopeKey!: string;

  @ManyToOne(() => MemberLevel, { nullable: true, onDelete: "SET NULL" })
  templateLevel!: MemberLevel | null;

  @RelationId((level: MemberLevel) => level.templateLevel)
  templateLevelId!: number | null;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "int", default: 0 })
  minPoints!: number;

  @Column({ type: "int", default: 0 })
  minGrowth!: number;

  @Column({ type: "int", nullable: true })
  validityDays!: number | null;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 1 })
  discountRate!: string;

  @Column({ type: "boolean", default: false })
  priorityBooking!: boolean;

  @Column({ type: "json", nullable: true })
  benefits!: Array<{ key: string; name: string; description?: string }> | null;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
