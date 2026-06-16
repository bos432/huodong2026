import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("member_levels")
export class MemberLevel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "int", default: 0 })
  minPoints!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 1 })
  discountRate!: string;

  @Column({ type: "boolean", default: false })
  priorityBooking!: boolean;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
