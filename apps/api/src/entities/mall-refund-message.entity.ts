import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MallRefund } from "./mall-refund.entity";
import { Tenant } from "./tenant.entity";

@Entity("mall_refund_messages")
@Index("IDX_mall_refund_messages_refund_time", ["refund", "createdAt"])
export class MallRefundMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallRefund, { eager: true, nullable: false, onDelete: "CASCADE" })
  refund!: MallRefund;

  @Column({ type: "varchar", length: 24 })
  actorType!: "user" | "merchant" | "platform" | "system";

  @Column({ type: "varchar", length: 80, nullable: true })
  actorName!: string | null;

  @Column({ type: "varchar", length: 32, default: "message" })
  messageType!: "message" | "evidence" | "status" | "intervention";

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "json", nullable: true })
  images!: string[] | null;

  @Column({ type: "json", nullable: true })
  detail!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
