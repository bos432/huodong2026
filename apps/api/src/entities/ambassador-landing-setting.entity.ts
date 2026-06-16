import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("ambassador_landing_settings")
export class AmbassadorLandingSetting {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "tinyint", default: 1 })
  enabled!: boolean;

  @Column({ type: "json", nullable: true })
  config!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
