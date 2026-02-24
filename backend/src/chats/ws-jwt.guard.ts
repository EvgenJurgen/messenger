import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import type { AuthenticatedUser } from '../common/types/auth.types.js';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token =
      (client.handshake.auth?.token as string) ||
      (Array.isArray(client.handshake.query?.token)
        ? client.handshake.query.token[0]
        : (client.handshake.query?.token as string));
    if (!token) {
      throw new WsException('Unauthorized');
    }
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string }>(token);
      const user = await this.authService.validateByPayload({
        sub: payload.sub,
        email: payload.email,
      });
      if (!user) throw new WsException('Unauthorized');
      (client.data as { user: AuthenticatedUser }).user = user;
      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }
}
