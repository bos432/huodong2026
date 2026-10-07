import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("release_acceptance_fixtures")
@Index(["scopeKey", "kind", "maskedIdentifier"], { unique: true })
export class ReleaseAcceptanceFixture {
  @PrimaryGeneratedColumn() id!: number;
  @Index() @Column({ type: "varchar", length: 80 }) scopeKey!: string;
  @Column({ type: "varchar", length: 32 }) kind!: string;
  @Column({ type: "varchar", length: 160 }) label!: string;
  @Column({ type: "varchar", length: 160 }) maskedIdentifier!: string;
  @Column({ type: "varchar", length: 24, default: "planned" }) status!: string;
  @Column({ type: "varchar", length: 500, nullable: true }) notes!: string | null;
  @Column({ type: "json", nullable: true }) evidence!: Record<string, unknown> | null;
  @Column({ type: "varchar", length: 120, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
