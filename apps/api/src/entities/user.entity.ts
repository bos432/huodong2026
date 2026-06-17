import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 128, nullable: true, unique: true })
  openid!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  wechatAppId!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  unionid!: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  sourceChannel!: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  lastLoginChannel!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  nickname!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: "varchar", length: 32, nullable: true, unique: true })
  phone!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ type: "datetime", nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
