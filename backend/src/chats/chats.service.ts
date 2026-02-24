import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatsGateway } from './chats.gateway.js';
import { Conversation } from './entities/conversation.entity.js';
import { Message } from './entities/message.entity.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly usersService: UsersService,
    private readonly chatsGateway: ChatsGateway,
  ) {}

  /** Get or create conversation between current user and other user (ordered by id for uniqueness). */
  async getOrCreateConversation(currentUserId: string, otherUserId: string): Promise<Conversation> {
    const [id1, id2] = [currentUserId, otherUserId].sort();
    let conv = await this.conversationRepository.findOne({
      where: { participant1Id: id1, participant2Id: id2 },
      relations: ['participant1', 'participant2'],
    });
    if (conv) return conv;
    conv = this.conversationRepository.create({
      participant1Id: id1,
      participant2Id: id2,
      initiatedByUserId: currentUserId,
    });
    conv = await this.conversationRepository.save(conv);
    return this.conversationRepository.findOne({
      where: { id: conv.id },
      relations: ['participant1', 'participant2'],
    }) as Promise<Conversation>;
  }

  /** List conversations for current user (visible: initiated by me OR has at least one message). */
  async listConversations(currentUserId: string): Promise<
    {
      id: string;
      otherUser: { id: string; nickname: string | null; avatarPath: string | null };
      lastMessage: { content: string; senderId: string; createdAt: Date } | null;
    }[]
  > {
    const convs = await this.conversationRepository.find({
      where: [
        { participant1Id: currentUserId },
        { participant2Id: currentUserId },
      ],
      relations: ['participant1', 'participant2'],
      order: { createdAt: 'DESC' },
    });

    const result: {
      id: string;
      otherUser: { id: string; nickname: string | null; avatarPath: string | null };
      lastMessage: { content: string; senderId: string; createdAt: Date } | null;
    }[] = [];
    for (const c of convs) {
      const messageCount = await this.messageRepository.count({ where: { conversationId: c.id } });
      const visible = c.initiatedByUserId === currentUserId || messageCount > 0;
      if (!visible) continue;
      const otherUser = c.participant1Id === currentUserId ? c.participant2! : c.participant1!;
      const lastMsg = await this.messageRepository.findOne({
        where: { conversationId: c.id },
        order: { createdAt: 'DESC' },
      });
      result.push({
        id: c.id,
        otherUser: {
          id: otherUser.id,
          nickname: otherUser.nickname,
          avatarPath: otherUser.avatarPath,
        },
        lastMessage: lastMsg
          ? { content: lastMsg.content, senderId: lastMsg.senderId, createdAt: lastMsg.createdAt }
          : null,
      });
    }
    result.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? new Date(0);
      const bTime = b.lastMessage?.createdAt ?? new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    return result;
  }

  async getMessages(conversationId: string, currentUserId: string, limit: number, before?: string) {
    const conv = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conv) return { messages: [], hasMore: false };
    const isParticipant =
      conv.participant1Id === currentUserId || conv.participant2Id === currentUserId;
    if (!isParticipant) return { messages: [], hasMore: false };

    let qb = this.messageRepository
      .createQueryBuilder('m')
      .where('m.conversation_id = :cid', { cid: conversationId })
      .orderBy('m.created_at', 'DESC')
      .take(limit + 1);
    if (before) {
      const beforeMsg = await this.messageRepository.findOne({
        where: { id: before, conversationId },
      });
      if (beforeMsg) {
        qb = qb.andWhere('m.created_at < :beforeTime', { beforeTime: beforeMsg.createdAt });
      }
    }
    const messages = await qb.getMany();
    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();
    return {
      messages: messages.reverse(),
      hasMore,
    };
  }

  /** Returns the other participant's user id, or null if not a participant. */
  async getOtherParticipantId(conversationId: string, currentUserId: string): Promise<string | null> {
    const conv = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conv) return null;
    if (conv.participant1Id === currentUserId) return conv.participant2Id;
    if (conv.participant2Id === currentUserId) return conv.participant1Id;
    return null;
  }

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const conv = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    const isParticipant = conv.participant1Id === senderId || conv.participant2Id === senderId;
    if (!isParticipant) throw new ForbiddenException('Forbidden');
    const msg = this.messageRepository.create({
      conversationId,
      senderId,
      content: content.trim(),
    });
    const saved = await this.messageRepository.save(msg);
    const recipientId =
      conv.participant1Id === senderId ? conv.participant2Id : conv.participant1Id;
    this.chatsGateway.emitNewMessageToRecipient(recipientId, saved);
    return saved;
  }
}
