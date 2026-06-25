import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

export type HomepageDecorationSnapshotRow = {
  type: string;
  title: string | null;
  subtitle: string | null;
  enabled: boolean;
  sortOrder: number;
  config: Record<string, unknown>;
  layout: Record<string, unknown>;
};

@Entity("homepage_decoration_versions")
export class HomepageDecorationVersion {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 40, default: "home" })
  pageKey!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  name!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  note!: string | null;

  @Column({ type: "json" })
  sections!: HomepageDecorationSnapshotRow[];

  @Column({ type: "int", default: 0 })
  sectionCount!: number;

  @Column({ type: "int", nullable: true })
  createdById!: number | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  createdByName!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
