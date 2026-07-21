import { BeforeInsert, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { yuanToFen } from "../shared/money";
import { PaymentMethod } from "../shared/domain";
import { Course } from "./course.entity";
import { User } from "./user.entity";

export enum CourseOrderStatus {
  PendingPayment = "pending_payment",
  Paid = "paid",
  PartiallyRefunded = "partially_refunded",
  Refunded = "refunded",
  Closed = "closed"
}

@Index("UQ_course_orders_user_client_key", ["user", "clientOrderKey"], { unique: true })
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

  @Column({ type: "bigint", default: 0 })
  amountFen!: number;

  @Column({ type: "json", nullable: true })
  businessSnapshot!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  clientOrderKey!: string | null;

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

  @BeforeInsert()
  freezeBusinessMoney() {
    this.amountFen = yuanToFen(this.amount);
    this.businessSnapshot ||= { amount: this.amount, paymentMethod: this.paymentMethod, courseId: this.course?.id || null, courseTitle: this.course?.title || null, clientOrderKey: this.clientOrderKey || null };
  }
}
