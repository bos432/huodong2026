import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("tenants")
export class Tenant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 64, unique: true })
  code!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  region!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  contactName!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  contactPhone!: string | null;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "json", nullable: true })
  settings!: Record<string, unknown> | null;


  @Column({ type: "text", nullable: true })
  remark!: string | null;
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
