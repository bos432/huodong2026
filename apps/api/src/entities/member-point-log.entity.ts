import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { User } from "./user.entity";

@Entity("member_point_logs")
@Unique(["sourceType", "sourceId"])
export class MemberPointLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "int" })
  points!: number;

  @Column({ type: "varchar", length: 40 })
  type!: "earn" | "deduct" | "adjust";

  @Column({ type: "varchar", length: 60 })
  sourceType!: string;

  @Column({ type: "varchar", length: 80 })
  sourceId!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
