import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { HomepageDecorationSnapshotRow } from "./homepage-decoration-version.entity";
import { Tenant } from "./tenant.entity";

@Entity("homepage_publications")
@Unique(["tenantScopeKey", "pageKey"])
export class HomepagePublication {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 32, default: "platform" }) tenantScopeKey!: string;
  @Column({ type: "varchar", length: 40, default: "home" }) pageKey!: string;
  @Column({ type: "json" }) sections!: HomepageDecorationSnapshotRow[];
  @Column({ type: "int", nullable: true }) versionId!: number | null;
  @Column({ type: "int", nullable: true }) publishedById!: number | null;
  @Column({ type: "varchar", length: 80, nullable: true }) publishedByName!: string | null;
  @Column({ type: "datetime" }) publishedAt!: Date;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
