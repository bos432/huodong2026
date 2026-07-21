import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { SupportWorkOrder } from "./support-work-order.entity";

@Entity("support_work_order_logs")
@Index(["workOrder", "createdAt"])
export class SupportWorkOrderLog {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => SupportWorkOrder, (workOrder) => workOrder.logs, { onDelete: "CASCADE" }) workOrder!: SupportWorkOrder;
  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" }) operator!: AdminUser | null;
  @Column({ type: "varchar", length: 80 }) operatorName!: string;
  @Column({ type: "varchar", length: 40 }) action!: string;
  @Column({ type: "text", nullable: true }) content!: string | null;
  @Column({ type: "varchar", length: 30, nullable: true }) fromStatus!: string | null;
  @Column({ type: "varchar", length: 30, nullable: true }) toStatus!: string | null;
  @Column({ type: "json", nullable: true }) snapshot!: Record<string, unknown> | null;
  @CreateDateColumn() createdAt!: Date;
}
