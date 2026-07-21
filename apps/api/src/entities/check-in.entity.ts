import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { Registration } from "./registration.entity";
import { CheckInPoint } from "./check-in-point.entity";

@Entity("check_ins")
@Index("IDX_check_ins_registration_revoked_created", ["registration", "revokedAt", "createdAt"])
export class CheckIn {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Registration, { eager: true })
  registration!: Registration;

  @ManyToOne(() => AdminUser, { eager: true })
  operator!: AdminUser;

  @ManyToOne(() => CheckInPoint, { eager: true, nullable: true, onDelete: "SET NULL" })
  point!: CheckInPoint | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @Column({ type: "datetime", nullable: true }) revokedAt!: Date | null;
  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" }) revokedBy!: AdminUser | null;
  @Column({ type: "varchar", length: 500, nullable: true }) revokeReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
