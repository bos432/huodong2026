import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { AidApplication } from "./aid-application.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("aid_application_events")
export class AidApplicationEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => AidApplication, { eager: true, nullable: false, onDelete: "CASCADE" })
  application!: AidApplication;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  user!: User | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  admin!: AdminUser | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160 })
  businessKey!: string;

  @Column({ type: "varchar", length: 40 })
  action!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  fromStatus!: string | null;

  @Column({ type: "varchar", length: 32 })
  toStatus!: string;

  @Column({ type: "text", nullable: true })
  contentEncrypted!: string | null;

  @Column({ type: "json", nullable: true })
  snapshot!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
