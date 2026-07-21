import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

export type ContentGovernanceScope = "all" | "community" | "forum";
export type ContentKeywordAction = "review" | "reject" | "mask";

@Entity("content_keyword_rules")
@Index("IDX_content_keyword_rule_scope", ["tenant", "scope", "enabled"])
export class ContentKeywordRule {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 20, default: "all" }) scope!: ContentGovernanceScope;
  @Column({ type: "varchar", length: 120 }) keyword!: string;
  @Column({ type: "varchar", length: 20, default: "contains" }) matchMode!: "contains" | "exact";
  @Column({ type: "varchar", length: 20, default: "review" }) action!: ContentKeywordAction;
  @Column({ type: "varchar", length: 120, nullable: true }) replacement!: string | null;
  @Column({ type: "tinyint", default: 1 }) enabled!: boolean;
  @Column({ type: "int", nullable: true }) createdByAdminId!: number | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
