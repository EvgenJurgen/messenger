import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity.js';
import { Message } from './entities/message.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { ChatsController } from './chats.controller.js';
import { ChatsGateway } from './chats.gateway.js';
import { ChatsService } from './chats.service.js';
import { WsJwtGuard } from './ws-jwt.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    AuthModule,
    UsersModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway, WsJwtGuard],
  exports: [ChatsService],
})
export class ChatsModule {}
