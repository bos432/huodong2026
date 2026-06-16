import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("ambassador_cases")
export class AmbassadorCase {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  field!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  metrics!: string | null;

  @Column({ type: "text", nullable: true })
  quote!: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "tinyint", default: 1 })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
