import { OrderStatus, PaymentMethod } from "../shared/domain";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Registration } from "./registration.entity";
import { Agent } from "./agent.entity";
import { Coupon } from "./coupon.entity";
import { MemberLevel } from "./member-level.entity";
import { Tenant } from "./tenant.entity";
import { TicketType } from "./ticket-type.entity";

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 64, unique: true })
  orderNo!: string;

  @ManyToOne(() => Registration, { eager: true })
  registration!: Registration;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => Agent, { eager: true, nullable: true })
  agent!: Agent | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  originalAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discountAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  memberDiscountAmount!: string;

  @Column({ type: "int", default: 0 })
  pointsUsed!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  pointsDiscountAmount!: string;

  @Column({ type: "datetime", nullable: true })
  pointsRefundedAt!: Date | null;

  @Column({ type: "enum", enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: "enum", enum: OrderStatus })
  status!: OrderStatus;

  @Column({ type: "varchar", length: 128, nullable: true })
  transactionNo!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  paidByAdmin!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  paidRemark!: string | null;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @Column({ type: "datetime", nullable: true })
  paidAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  expiresAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  closedAt!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  closeReason!: string | null;

  @ManyToOne(() => TicketType, { eager: true, nullable: true })
  ticketType!: TicketType | null;

  @ManyToOne(() => Coupon, { eager: true, nullable: true })
  coupon!: Coupon | null;

  @ManyToOne(() => MemberLevel, { eager: true, nullable: true })
  memberLevel!: MemberLevel | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
