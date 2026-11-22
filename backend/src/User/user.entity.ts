import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  surname!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  mobile!: string;

  @Column()
  passwordHash!: string;

  @Column({ nullable: true })
  favouritePlayer?: string;

  @Column('simple-json', { nullable: true })
  auditLogs?: {
    action: string;
    timestamp: string;
    details?: string;
  }[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}