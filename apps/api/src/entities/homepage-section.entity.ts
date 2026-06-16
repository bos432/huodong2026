import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("homepage_sections")
export class HomepageSection {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 40 })
  type!: string;

  @Column({ type: "varchar", length: 40, default: "home" })
  pageKey!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  title!: string | null;

  @Column({ type: "varchar", length: 240, nullable: true })
  subtitle!: string | null;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "json", nullable: true })
  config!: Record<string, unknown> | null;

  @Column({ type: "json", nullable: true })
  layout!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
