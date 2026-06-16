import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MemberLevel } from "./member-level.entity";
import { User } from "./user.entity";

@Entity("member_profiles")
export class MemberProfile {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, { eager: true, onDelete: "CASCADE" })
  @JoinColumn()
  user!: User;

  @ManyToOne(() => MemberLevel, { eager: true, nullable: true })
  level!: MemberLevel | null;

  @Column({ type: "int", default: 0 })
  points!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalSpent!: string;

  @Column({ type: "int", default: 0 })
  registrationCount!: number;

  @Column({ type: "int", default: 0 })
  checkInCount!: number;

  @Column({ type: "int", default: 0 })
  reviewCount!: number;

  @Column({ type: "datetime", nullable: true })
  lastActiveAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
