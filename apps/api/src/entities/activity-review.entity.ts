import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Registration } from "./registration.entity";
import { User } from "./user.entity";

@Entity("activity_reviews")
export class ActivityReview {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { eager: true, onDelete: "CASCADE" })
  activity!: Activity;

  @ManyToOne(() => Registration, { eager: true, onDelete: "CASCADE" })
  registration!: Registration;

  @ManyToOne(() => User, { eager: true })
  user!: User;

  @Column({ type: "int" })
  rating!: number;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 20, default: "visible" })
  status!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  adminReply!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}