import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { AmbassadorApplication } from "./ambassador-application.entity";

@Entity("ambassador_application_followups")
export class AmbassadorApplicationFollowup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 160, nullable: true, unique: true })
  businessKey!: string | null;

  @ManyToOne(() => AmbassadorApplication, { eager: true, onDelete: "CASCADE" })
  application!: AmbassadorApplication;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  operator!: AdminUser | null;

  @Column({ type: "varchar", length: 40, default: "wechat" })
  method!: string;

  @Column({ type: "varchar", length: 40, default: "contacted" })
  result!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "text", nullable: true })
  contentEncrypted!: string | null;

  @Column({ type: "varchar", length: 24, nullable: true })
  fromStatus!: string | null;

  @Column({ type: "varchar", length: 24, nullable: true })
  toStatus!: string | null;

  @Column({ type: "datetime", nullable: true })
  nextFollowAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
