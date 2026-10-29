import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UserRole } from '../../generated/prisma/client.js';
import { getJwtSecret } from '../utils/jwt-secret.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: UserRole };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token, ...extraParts] = (
      request.headers.authorization ?? ''
    )
      .trim()
      .split(/\s+/);
    if (
      scheme?.toLowerCase() !== 'bearer' ||
      !token ||
      extraParts.length > 0
    ) {
      throw new UnauthorizedException('A bearer token is required.');
    }

    const secret = getJwtSecret(this.configService);
    let payload: { sub?: unknown; role?: unknown; exp?: unknown };
    try {
      payload = await this.jwtService.verifyAsync(token, { secret });
    } catch (error) {
      if (
        error instanceof Error &&
        ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(
          error.name,
        )
      ) {
        throw new UnauthorizedException('Invalid or expired access token.');
      }

      throw error;
    }

    if (
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      typeof payload.exp !== 'number' ||
      (payload.role !== UserRole.MANAGER &&
        payload.role !== UserRole.DEVELOPER)
    ) {
      throw new UnauthorizedException('Invalid access token.');
    }

    request.user = { id: payload.sub, role: payload.role };
    return true;
  }
}
