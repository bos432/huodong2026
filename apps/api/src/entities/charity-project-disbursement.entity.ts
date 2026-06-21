import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { CharityProject } from "./charity-project.entity";
import { Tenant } from "./tenant.entity";

@Entity("charity_project_disbursements")
export class CharityProjectDisbursement {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CharityProject, { eager: true, onDelete: "CASCADE" })
  project!: CharityProject;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  operator!: AdminUser | null;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  proofUrl!: string | null;

  @Column({ type: "tinyint", default: 1 })
  publicVisible!: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
