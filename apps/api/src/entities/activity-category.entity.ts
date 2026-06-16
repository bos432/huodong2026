import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("activity_categories")
export class ActivityCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  iconUrl!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  coverUrl!: string | null;

  @Column({ default: true })
  publicVisible!: boolean;

  @Column({ type: "varchar", length: 40, default: "activity" })
  scene!: string;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
