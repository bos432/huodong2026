import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { Tenant } from "./tenant.entity";
import type { CredentialTemplateConfig, CredentialTemplateKey } from "../shared/credential-template";

@Entity("credential_templates")
@Index("UQ_credential_template_scope_key", ["scopeKey", "templateKey"], { unique: true })
export class CredentialTemplate {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "varchar", length: 40 }) scopeKey!: string;
  @Column({ type: "varchar", length: 40 }) templateKey!: CredentialTemplateKey;
  @ManyToOne(() => Tenant, { nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column({ type: "json" }) draftConfig!: CredentialTemplateConfig;
  @Column({ type: "json", nullable: true }) publishedConfig!: CredentialTemplateConfig | null;
  @Column({ type: "int", default: 0 }) publishedVersion!: number;
  @ManyToOne(() => AdminUser, { nullable: true, onDelete: "SET NULL" }) updatedBy!: AdminUser | null;
  @ManyToOne(() => AdminUser, { nullable: true, onDelete: "SET NULL" }) publishedBy!: AdminUser | null;
  @Column({ type: "datetime", nullable: true }) publishedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
