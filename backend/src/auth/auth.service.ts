import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { ENV_DEFAULTS } from '../common/config/env-defaults.js';
import { ERROR_KEYS } from '../common/constants/error-messages.js';
import { getErrorMessage } from '../common/constants/error-messages.js';
import { errorPayload } from '../common/utils/error-payload.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import type { AuthTokens, AuthenticatedUser, JwtPayload } from '../common/types/auth.types.js';
import { User } from '../users/entities/user.entity.js';
import { LoginDtoClass } from './dto/login.dto.js';
import { RegisterDtoClass } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get saltRounds(): number {
    const raw = this.configService.get<string>('BCRYPT_SALT_ROUNDS');
    return raw !== undefined ? parseInt(raw, 10) : ENV_DEFAULTS.BCRYPT_SALT_ROUNDS;
  }

  private get jwtExpiresIn(): number {
    const raw = this.configService.get<string>('JWT_EXPIRES_IN');
    return raw !== undefined ? parseInt(raw, 10) : ENV_DEFAULTS.JWT_EXPIRES_IN;
  }

  async register(dto: RegisterDtoClass): Promise<AuthTokens> {
    const existingByEmail = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingByEmail) {
      throw new ConflictException(
        errorPayload(ERROR_KEYS.AUTH_EMAIL_ALREADY_REGISTERED, getErrorMessage(ERROR_KEYS.AUTH_EMAIL_ALREADY_REGISTERED)),
      );
    }
    const existingByNickname = await this.userRepository.findOne({ where: { nickname: dto.nickname.trim() } });
    if (existingByNickname) {
      throw new ConflictException(
        errorPayload(ERROR_KEYS.AUTH_NICKNAME_ALREADY_TAKEN, getErrorMessage(ERROR_KEYS.AUTH_NICKNAME_ALREADY_TAKEN)),
      );
    }
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const user = this.userRepository.create({
      email: dto.email,
      nickname: dto.nickname.trim(),
      passwordHash,
      role: UserRole.USER,
    });
    const saved = await this.userRepository.save(user);
    return this.issueTokens(saved);
  }

  async login(dto: LoginDtoClass): Promise<AuthTokens> {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException(
        errorPayload(ERROR_KEYS.AUTH_INVALID_CREDENTIALS, getErrorMessage(ERROR_KEYS.AUTH_INVALID_CREDENTIALS)),
      );
    }
    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException(
        errorPayload(ERROR_KEYS.AUTH_INVALID_CREDENTIALS, getErrorMessage(ERROR_KEYS.AUTH_INVALID_CREDENTIALS)),
      );
    }
    return this.issueTokens(user);
  }

  async validateByPayload(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      avatarPath: user.avatarPath,
      nickname: user.nickname,
    };
  }

  private issueTokens(user: User): AuthTokens {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const expiresIn = this.jwtExpiresIn;
    const accessToken = this.jwtService.sign(payload, { expiresIn });
    return { accessToken, expiresIn };
  }
}
