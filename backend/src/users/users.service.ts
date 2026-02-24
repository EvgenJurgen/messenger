import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { ERROR_KEYS } from '../common/constants/error-messages.js';
import { getErrorMessage } from '../common/constants/error-messages.js';
import type { UploadedFile } from '../common/types/multer.types.js';
import { errorPayload } from '../common/utils/error-payload.js';
import { User } from './entities/user.entity.js';

const AVATARS_DIR = 'uploads/avatars';
const AVATAR_MAX_SIZE = 20 * 1024 * 1024;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async updateProfile(userId: string, nickname: string | null): Promise<{ nickname: string | null }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return { nickname: null };
    user.nickname = nickname?.trim() || null;
    await this.userRepository.save(user);
    return { nickname: user.nickname };
  }

  async uploadAvatar(
    userId: string,
    file: UploadedFile,
  ): Promise<{ avatarPath: string }> {
    if (file.size > AVATAR_MAX_SIZE) {
      throw new BadRequestException(
        errorPayload(ERROR_KEYS.PROFILE_AVATAR_TOO_LARGE, getErrorMessage(ERROR_KEYS.PROFILE_AVATAR_TOO_LARGE)),
      );
    }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        errorPayload(ERROR_KEYS.PROFILE_AVATAR_INVALID_TYPE, getErrorMessage(ERROR_KEYS.PROFILE_AVATAR_INVALID_TYPE)),
      );
    }
    await fs.mkdir(AVATARS_DIR, { recursive: true });
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${userId}-${Date.now()}${ext}`;
    const filePath = path.join(AVATARS_DIR, filename);
    await fs.writeFile(filePath, file.buffer);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return { avatarPath: filename };
    if (user.avatarPath) {
      try {
        await fs.unlink(path.join(AVATARS_DIR, user.avatarPath));
      } catch {
        // ignore old file missing
      }
    }
    user.avatarPath = filename;
    await this.userRepository.save(user);
    return { avatarPath: filename };
  }

  async avatarError(key: string): Promise<never> {
    throw new BadRequestException(errorPayload(key, getErrorMessage(key)));
  }

  async search(
    currentUserId: string,
    q: string,
    limit: number,
    offset: number,
  ): Promise<{ id: string; email: string; nickname: string | null; avatarPath: string | null }[]> {
    if (!q || q.length < 3) {
      return [];
    }
    const qb = this.userRepository
      .createQueryBuilder('u')
      .select(['u.id', 'u.email', 'u.nickname', 'u.avatarPath'])
      .where('u.id != :currentUserId', { currentUserId })
      .andWhere('(u.nickname ILIKE :q OR u.email ILIKE :q)', { q: `%${q}%` })
      .orderBy('u.nickname', 'ASC', 'NULLS LAST')
      .addOrderBy('u.email', 'ASC')
      .take(limit)
      .skip(offset);
    const users = await qb.getMany();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      avatarPath: u.avatarPath,
    }));
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.userRepository.find({ where: { id: In(ids) } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}
