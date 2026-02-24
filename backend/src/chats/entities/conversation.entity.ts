import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import type { Message } from './message.entity.js';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'participant1_id', type: 'uuid' })
  participant1Id!: string;

  @Column({ name: 'participant2_id', type: 'uuid' })
  participant2Id!: string;

  /** User who opened the chat first (chat visible to them before first message). */
  @Column({ name: 'initiated_by_user_id', type: 'uuid' })
  initiatedByUserId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant1_id' })
  participant1!: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant2_id' })
  participant2!: User;

  @OneToMany('Message', 'conversation')
  messages!: Message[];
}
