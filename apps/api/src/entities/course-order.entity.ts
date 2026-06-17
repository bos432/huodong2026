import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PaymentMethod } from "../shared/domain";
import { Course } from "./course.entity";
import { User } from "./user.entity";

export enum CourseOrderStatus {
  PendingPayment = "pending_payment",
  Paid = "paid",
  Closed = "closed"
}

@Entity("course_orders")
export class CourseOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 64, unique: true })
  orderNo!: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => Course, { eager: true, onDelete: "CASCADE" })
  course!: Course;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "enum", enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: "enum", enum: CourseOrderStatus })
  status!: CourseOrderStatus;

  @Column({ type: "varchar", length: 128, nullable: true })
  transactionNo!: string | null;

  @Column({ type: "datetime", nullable: true })
  paidAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  expiresAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  closedAt!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  closeReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
