import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { AmbassadorApplication } from "./ambassador-application.entity";

@Entity("ambassador_application_followups")
export class AmbassadorApplicationFollowup {
  @PrimaryGeneratedColumn()
  id!: number;

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

  @Column({ type: "datetime", nullable: true })
  nextFollowAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
