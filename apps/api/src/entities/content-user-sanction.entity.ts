import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { ContentGovernanceScope } from "./content-keyword-rule.entity";

@Entity("content_user_sanctions")
@Index("IDX_content_sanction_user_active", ["userId", "status", "endsAt"])
export class ContentUserSanction {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column() userId!: number;
  @Column({ type: "varchar", length: 20, default: "all" }) scope!: ContentGovernanceScope;
  @Column({ type: "varchar", length: 20, default: "mute" }) type!: "mute" | "ban";
  @Column({ type: "varchar", length: 20, default: "active" }) status!: "active" | "revoked" | "expired";
  @Column({ type: "varchar", length: 500 }) reason!: string;
  @Column({ type: "varchar", length: 40, nullable: true }) sourceType!: string | null;
  @Column({ type: "int", nullable: true }) sourceId!: number | null;
  @Column({ type: "datetime" }) startsAt!: Date;
  @Column({ type: "datetime", nullable: true }) endsAt!: Date | null;
  @Column({ type: "int", nullable: true }) issuedByAdminId!: number | null;
  @Column({ type: "int", nullable: true }) revokedByAdminId!: number | null;
  @Column({ type: "datetime", nullable: true }) revokedAt!: Date | null;
  @Column({ type: "varchar", length: 500, nullable: true }) revokeRemark!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
