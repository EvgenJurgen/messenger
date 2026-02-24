import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../common/types/auth.types.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { LoginDtoClass } from './dto/login.dto.js';
import { RegisterDtoClass } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';

/** Token pair returned by register and login. */
export interface AuthTokensResponse {
  accessToken: string;
  expiresIn: number;
}

/** Current user info returned by GET /me. */
export type AuthMeResponse = AuthenticatedUser;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDtoClass): Promise<AuthTokensResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDtoClass): Promise<AuthTokensResponse> {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthMeResponse {
    return user;
  }
}
