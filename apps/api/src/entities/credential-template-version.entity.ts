import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { CredentialTemplate } from "./credential-template.entity";
import type { CredentialTemplateConfig } from "../shared/credential-template";

@Entity("credential_template_versions")
@Index("UQ_credential_template_version", ["templateId", "version"], { unique: true })
export class CredentialTemplateVersion {
  @PrimaryGeneratedColumn() id!: number;
  @Column() templateId!: number;
  @ManyToOne(() => CredentialTemplate, { onDelete: "CASCADE" }) template!: CredentialTemplate;
  @Column({ type: "int" }) version!: number;
  @Column({ type: "json" }) config!: CredentialTemplateConfig;
  @Column({ type: "varchar", length: 300, nullable: true }) note!: string | null;
  @ManyToOne(() => AdminUser, { nullable: true, onDelete: "SET NULL" }) publishedBy!: AdminUser | null;
  @CreateDateColumn() createdAt!: Date;
}
