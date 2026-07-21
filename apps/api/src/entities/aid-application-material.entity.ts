import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { AidApplication } from "./aid-application.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("aid_application_materials")
@Index("IDX_aid_material_application_status", ["application", "status", "createdAt"])
export class AidApplicationMaterial {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => AidApplication, { eager: true, nullable: false, onDelete: "CASCADE" })
  application!: AidApplication;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  uploadedByUser!: User | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  uploadedByAdmin!: AdminUser | null;

  @Column({ type: "varchar", length: 40 })
  category!: string;

  @Column({ type: "text" })
  originalNameEncrypted!: string;

  @Column({ type: "varchar", length: 100 })
  mimetype!: string;

  @Column({ type: "bigint" })
  size!: number;

  @Column({ type: "varchar", length: 255 })
  encryptedReference!: string;

  @Column({ type: "varchar", length: 20, default: "active" })
  status!: "active" | "removed";

  @CreateDateColumn()
  createdAt!: Date;
}
