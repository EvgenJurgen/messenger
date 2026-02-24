import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import type { ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import type { AuthenticatedUser } from '../common/types/auth.types.js';
import { WsJwtGuard } from './ws-jwt.guard.js';
import { Conversation } from './entities/conversation.entity.js';
import type { Message } from './entities/message.entity.js';

export const MESSAGE_NEW = 'message:new';
export const USER_STATUS = 'user:status';
/** Sent only to the connecting client with the current list of online user IDs. */
export const USER_STATUS_INITIAL = 'user:status:initial';
export const TYPING = 'typing';

/** Video call: caller → server → callee */
export const VIDEO_CALL_REQUEST = 'video-call:request';
/** Callee → server → caller */
export const VIDEO_CALL_ACCEPT = 'video-call:accept';
export const VIDEO_CALL_REJECT = 'video-call:reject';
/** Either party ends the call; payload may include durationSeconds (from caller). */
export const VIDEO_CALL_END = 'video-call:end';
/** WebRTC signaling: forwarded to the other peer */
export const VIDEO_CALL_OFFER = 'video-call:offer';
export const VIDEO_CALL_ANSWER = 'video-call:answer';
export const VIDEO_CALL_ICE = 'video-call:ice';

export interface TypingPayload {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

export interface VideoCallRequestPayload {
  conversationId: string;
  callerId: string;
  callerNickname?: string;
}

export interface VideoCallAcceptPayload {
  conversationId: string;
  calleeId: string;
}

export interface VideoCallRejectPayload {
  conversationId: string;
  calleeId: string;
}

export interface VideoCallEndPayload {
  conversationId: string;
  durationSeconds?: number;
}

export interface VideoCallSignalPayload {
  conversationId: string;
  targetUserId: string;
  signal: unknown;
}

export interface MessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

@WebSocketGateway({
  cors: { origin: true },
  path: '/socket.io',
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** userId -> number of connected sockets (e.g. multiple tabs). */
  private readonly userSocketCounts = new Map<string, number>();

  constructor(
    private readonly wsJwtGuard: WsJwtGuard,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const ctx = {
      switchToWs: () => ({ getClient: () => client }),
      getType: () => 'ws' as const,
      getHandler: () => ({} as never),
      getClass: () => ({} as never),
      getArgs: () => [],
      getArgByIndex: () => ({} as never),
    } as unknown as ExecutionContext;
    try {
      await this.wsJwtGuard.canActivate(ctx);
    } catch {
      client.disconnect(true);
      return;
    }
    const user = (client.data as { user: AuthenticatedUser }).user;
    client.join(`user:${user.id}`);
    const prev = this.userSocketCounts.get(user.id) ?? 0;
    this.userSocketCounts.set(user.id, prev + 1);
    if (prev === 0) {
      this.server.emit(USER_STATUS, { userId: user.id, online: true });
    }
    const onlineUserIds = Array.from(this.userSocketCounts.keys());
    client.emit(USER_STATUS_INITIAL, { userIds: onlineUserIds });
  }

  @SubscribeMessage(TYPING)
  async handleTyping(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = (client.data as { user?: AuthenticatedUser }).user;
    const body = Array.isArray(payload) ? payload[0] : payload;
    const conversationId = typeof body === 'object' && body !== null && 'conversationId' in body ? (body as { conversationId: string }).conversationId : undefined;
    const isTyping = typeof body === 'object' && body !== null && 'isTyping' in body ? (body as { isTyping: boolean }).isTyping : undefined;
    if (!user?.id || typeof conversationId !== 'string' || typeof isTyping !== 'boolean') return;
    const conv = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conv) return;
    const otherId = conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id;
    if (otherId === user.id) return;
    this.server.to(`user:${otherId}`).emit(TYPING, {
      userId: user.id,
      conversationId,
      isTyping,
    } as TypingPayload);
  }

  @SubscribeMessage(VIDEO_CALL_REQUEST)
  async handleVideoCallRequest(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = (client.data as { user?: AuthenticatedUser }).user;
    const body = Array.isArray(payload) ? payload[0] : payload;
    if (!user?.id || typeof body !== 'object' || body === null) return;
    const { conversationId, callerNickname } = body as { conversationId?: string; callerNickname?: string };
    if (typeof conversationId !== 'string') return;
    const conv = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participant1', 'participant2'],
    });
    if (!conv) return;
    const calleeId = conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id;
    if (calleeId === user.id) return;
    const requestPayload: VideoCallRequestPayload = {
      conversationId,
      callerId: user.id,
      callerNickname: typeof callerNickname === 'string' ? callerNickname : undefined,
    };
    this.server.to(`user:${calleeId}`).emit(VIDEO_CALL_REQUEST, requestPayload);
  }

  @SubscribeMessage(VIDEO_CALL_ACCEPT)
  async handleVideoCallAccept(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = (client.data as { user?: AuthenticatedUser }).user;
    const body = Array.isArray(payload) ? payload[0] : payload;
    if (!user?.id || typeof body !== 'object' || body === null) return;
    const { conversationId } = body as { conversationId?: string };
    if (typeof conversationId !== 'string') return;
    const conv = await this.conversationRepository.findOne({ where: { id: conversationId } });
    if (!conv) return;
    const callerId = conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id;
    if (callerId === user.id) return;
    this.server.to(`user:${callerId}`).emit(VIDEO_CALL_ACCEPT, {
      conversationId,
      calleeId: user.id,
    } as VideoCallAcceptPayload);
  }

  @SubscribeMessage(VIDEO_CALL_REJECT)
  async handleVideoCallReject(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = (client.data as { user?: AuthenticatedUser }).user;
    const body = Array.isArray(payload) ? payload[0] : payload;
    if (!user?.id || typeof body !== 'object' || body === null) return;
    const { conversationId } = body as { conversationId?: string };
    if (typeof conversationId !== 'string') return;
    const conv = await this.conversationRepository.findOne({ where: { id: conversationId } });
    if (!conv) return;
    const callerId = conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id;
    if (callerId === user.id) return;
    this.server.to(`user:${callerId}`).emit(VIDEO_CALL_REJECT, {
      conversationId,
      calleeId: user.id,
    } as VideoCallRejectPayload);
  }

  @SubscribeMessage(VIDEO_CALL_END)
  async handleVideoCallEnd(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = (client.data as { user?: AuthenticatedUser }).user;
    const body = Array.isArray(payload) ? payload[0] : payload;
    if (!user?.id || typeof body !== 'object' || body === null) return;
    const { conversationId, durationSeconds } = body as { conversationId?: string; durationSeconds?: number };
    if (typeof conversationId !== 'string') return;
    const conv = await this.conversationRepository.findOne({ where: { id: conversationId } });
    if (!conv) return;
    const otherId = conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id;
    this.server.to(`user:${otherId}`).emit(VIDEO_CALL_END, {
      conversationId,
      durationSeconds: typeof durationSeconds === 'number' ? durationSeconds : undefined,
    } as VideoCallEndPayload);
  }

  @SubscribeMessage(VIDEO_CALL_OFFER)
  async handleVideoCallOffer(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = (client.data as { user?: AuthenticatedUser }).user;
    const body = Array.isArray(payload) ? payload[0] : payload;
    if (!user?.id || typeof body !== 'object' || body === null) return;
    const { conversationId, targetUserId, signal } = body as VideoCallSignalPayload;
    if (typeof conversationId !== 'string' || typeof targetUserId !== 'string') return;
    const conv = await this.conversationRepository.findOne({ where: { id: conversationId } });
    if (!conv) return;
    const isParticipant = conv.participant1Id === user.id || conv.participant2Id === user.id;
    if (!isParticipant || (targetUserId !== conv.participant1Id && targetUserId !== conv.participant2Id)) return;
    this.server.to(`user:${targetUserId}`).emit(VIDEO_CALL_OFFER, { conversationId, signal });
  }

  @SubscribeMessage(VIDEO_CALL_ANSWER)
  async handleVideoCallAnswer(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = (client.data as { user?: AuthenticatedUser }).user;
    const body = Array.isArray(payload) ? payload[0] : payload;
    if (!user?.id || typeof body !== 'object' || body === null) return;
    const { conversationId, targetUserId, signal } = body as VideoCallSignalPayload;
    if (typeof conversationId !== 'string' || typeof targetUserId !== 'string') return;
    const conv = await this.conversationRepository.findOne({ where: { id: conversationId } });
    if (!conv) return;
    const isParticipant = conv.participant1Id === user.id || conv.participant2Id === user.id;
    if (!isParticipant || (targetUserId !== conv.participant1Id && targetUserId !== conv.participant2Id)) return;
    this.server.to(`user:${targetUserId}`).emit(VIDEO_CALL_ANSWER, { conversationId, signal });
  }

  @SubscribeMessage(VIDEO_CALL_ICE)
  async handleVideoCallIce(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = (client.data as { user?: AuthenticatedUser }).user;
    const body = Array.isArray(payload) ? payload[0] : payload;
    if (!user?.id || typeof body !== 'object' || body === null) return;
    const { conversationId, targetUserId, signal } = body as VideoCallSignalPayload;
    if (typeof conversationId !== 'string' || typeof targetUserId !== 'string') return;
    const conv = await this.conversationRepository.findOne({ where: { id: conversationId } });
    if (!conv) return;
    const isParticipant = conv.participant1Id === user.id || conv.participant2Id === user.id;
    if (!isParticipant || (targetUserId !== conv.participant1Id && targetUserId !== conv.participant2Id)) return;
    this.server.to(`user:${targetUserId}`).emit(VIDEO_CALL_ICE, { conversationId, signal });
  }

  handleDisconnect(client: Socket): void {
    const user = (client.data as { user?: AuthenticatedUser }).user;
    if (user?.id) {
      const count = (this.userSocketCounts.get(user.id) ?? 1) - 1;
      if (count <= 0) {
        this.userSocketCounts.delete(user.id);
        this.server.emit(USER_STATUS, { userId: user.id, online: false });
      } else {
        this.userSocketCounts.set(user.id, count);
      }
    }
  }

  emitNewMessageToRecipient(recipientUserId: string, msg: Message): void {
    const payload: MessagePayload = {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    };
    this.server.to(`user:${recipientUserId}`).emit(MESSAGE_NEW, payload);
  }

  isUserOnline(userId: string): boolean {
    return (this.userSocketCounts.get(userId) ?? 0) > 0;
  }
}
