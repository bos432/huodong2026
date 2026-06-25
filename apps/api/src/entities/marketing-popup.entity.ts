import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

export type MarketingPopupButton = {
  text: string;
  link?: string;
  style?: "primary" | "secondary";
};

@Entity("marketing_popups")
export class MarketingPopup {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  subtitle!: string | null;

  @Column({ type: "text", nullable: true })
  content!: string | null;

  @Column({ type: "varchar", length: 180, nullable: true })
  emphasis!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ type: "varchar", length: 40, default: "notice" })
  type!: string;

  @Column({ type: "json", nullable: true })
  platforms!: string[] | null;

  @Column({ type: "json", nullable: true })
  placements!: string[] | null;

  @Column({ type: "json", nullable: true })
  buttons!: MarketingPopupButton[] | null;

  @Column({ type: "varchar", length: 40, default: "once_per_day" })
  frequency!: string;

  @Column({ type: "int", default: 0 })
  priority!: number;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "boolean", default: true })
  dismissible!: boolean;

  @Column({ type: "datetime", nullable: true })
  startAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  endAt!: Date | null;

  @Column({ type: "int", default: 0 })
  impressionCount!: number;

  @Column({ type: "int", default: 0 })
  clickCount!: number;

  @Column({ type: "int", default: 0 })
  closeCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
