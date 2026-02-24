import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ENV_DEFAULTS } from '../../common/config/env-defaults.js';
import { ERROR_KEYS } from '../../common/constants/error-messages.js';
import { getErrorMessage } from '../../common/constants/error-messages.js';
import { errorPayload } from '../../common/utils/error-payload.js';
import type { AuthenticatedUser, JwtPayload } from '../../common/types/auth.types.js';
import { AuthService } from '../auth.service.js';

export type JwtStrategyValidateResult = AuthenticatedUser;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', ENV_DEFAULTS.JWT_SECRET),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtStrategyValidateResult> {
    const user = await this.authService.validateByPayload(payload);
    if (!user) {
      throw new UnauthorizedException(
        errorPayload(ERROR_KEYS.AUTH_UNAUTHORIZED, getErrorMessage(ERROR_KEYS.AUTH_UNAUTHORIZED)),
      );
    }
    return user;
  }
}
