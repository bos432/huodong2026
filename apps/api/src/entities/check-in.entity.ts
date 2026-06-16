import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { Registration } from "./registration.entity";

@Entity("check_ins")
export class CheckIn {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Registration, { eager: true })
  registration!: Registration;

  @ManyToOne(() => AdminUser, { eager: true })
  operator!: AdminUser;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}