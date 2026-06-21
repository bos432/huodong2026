import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CharityProject } from "./charity-project.entity";

@Entity("charity_project_updates")
export class CharityProjectUpdate {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CharityProject, { eager: true, onDelete: "CASCADE" })
  project!: CharityProject;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  proofUrl!: string | null;

  @Column({ type: "tinyint", default: 1 })
  publicVisible!: boolean;

  @Column({ type: "datetime", nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
