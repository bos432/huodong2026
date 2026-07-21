import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Tenant } from "./tenant.entity";

@Entity("ticket_types")
export class TicketType {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { eager: true, onDelete: "CASCADE" })
  activity!: Activity;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: string;

  @Column({ type: "int", nullable: true })
  capacity!: number | null;

  @Column({ type: "int", default: 1 }) perUserLimit!: number;
  @Column({ type: "datetime", nullable: true }) saleStartsAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) saleEndsAt!: Date | null;
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true }) earlyBirdPrice!: string | null;
  @Column({ type: "datetime", nullable: true }) earlyBirdEndsAt!: Date | null;
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true }) memberPrice!: string | null;
  @Column({ type: "json", nullable: true }) tierPrices!: Array<{ minSold: number; price: number }> | null;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
