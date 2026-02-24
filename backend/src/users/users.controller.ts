import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedUser } from '../common/types/auth.types.js';
import type { UploadedFile as MulterUploadedFile } from '../common/types/multer.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';

const AVATAR_MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') q: string,
    @Query('limit') limit = '10',
    @Query('offset') offset = '0',
  ) {
    const parsedLimit = Math.min(20, Math.max(1, parseInt(limit, 10) || 10));
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);
    return this.usersService.search(user.id, q ?? '', parsedLimit, parsedOffset);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { nickname?: string },
  ) {
    return this.usersService.updateProfile(user.id, body.nickname ?? null);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: AVATAR_MAX_SIZE } }))
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: MulterUploadedFile | undefined,
  ) {
    if (!file) {
      await this.usersService.avatarError('profile.avatar_required');
    }
    const fileToUpload = file as MulterUploadedFile;
    if (fileToUpload.size > AVATAR_MAX_SIZE) {
      await this.usersService.avatarError('profile.avatar_too_large');
    }
    if (!ALLOWED_MIME.includes(fileToUpload.mimetype)) {
      await this.usersService.avatarError('profile.avatar_invalid_type');
    }
    return this.usersService.uploadAvatar(user.id, fileToUpload);
  }
}
