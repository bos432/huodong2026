import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { CharityProject } from "./charity-project.entity";
import { Tenant } from "./tenant.entity";

@Entity("charity_project_events")
export class CharityProjectEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => CharityProject, { eager: true, nullable: false, onDelete: "CASCADE" })
  project!: CharityProject;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  operator!: AdminUser | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160 })
  businessKey!: string;

  @Column({ type: "varchar", length: 32 })
  action!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  fromStatus!: string | null;

  @Column({ type: "varchar", length: 32 })
  toStatus!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  remark!: string | null;

  @Column({ type: "json", nullable: true })
  snapshot!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
