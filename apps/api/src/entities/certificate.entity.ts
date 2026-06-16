import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("certificates")
export class Certificate {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column() name!: string;
  @Column({ type: "varchar", length: 500, nullable: true }) imageUrl!: string | null;
  @Column({ nullable: true }) threshold!: number | null;
  @CreateDateColumn() issuedAt!: Date;
}
