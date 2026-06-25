import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { HomepageDecorationSnapshotRow } from "./homepage-decoration-version.entity";

@Entity("homepage_decoration_templates")
export class HomepageDecorationTemplate {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 40, default: "home" })
  pageKey!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 60, nullable: true })
  category!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  description!: string | null;

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

  @UpdateDateColumn()
  updatedAt!: Date;
}
