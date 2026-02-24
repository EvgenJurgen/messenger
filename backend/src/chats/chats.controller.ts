import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ChatsService } from './chats.service.js';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get('conversations')
  async listConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.chatsService.listConversations(user.id);
  }

  @Post('conversations/with/:userId')
  async getOrCreateConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') otherUserId: string,
  ) {
    return this.chatsService.getOrCreateConversation(user.id, otherUserId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Query('limit') limit = '30',
    @Query('before') before?: string,
  ) {
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 30));
    const { messages, hasMore } = await this.chatsService.getMessages(
      conversationId,
      user.id,
      parsedLimit,
      before,
    );
    return { messages, hasMore };
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() body: { content: string },
  ) {
    const content = typeof body.content === 'string' ? body.content : '';
    return this.chatsService.sendMessage(conversationId, user.id, content);
  }
}
