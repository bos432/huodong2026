import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("user_favorites")
export class UserFavorite {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column() courseId!: number;
  @CreateDateColumn() createdAt!: Date;
}
