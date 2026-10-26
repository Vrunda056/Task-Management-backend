import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class RefreshSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string) {
    const refreshToken = this.generateToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
      select: { id: true },
    });

    return { refreshToken, expiresAt };
  }

  async rotate(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const now = new Date();
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const nextRefreshToken = this.generateToken();
    const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const update = await this.prisma.refreshSession.updateMany({
      where: {
        id: session.id,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        tokenHash: this.hashToken(nextRefreshToken),
        expiresAt: nextExpiresAt,
      },
    });

    if (update.count !== 1) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    return {
      userId: session.userId,
      refreshToken: nextRefreshToken,
      expiresAt: nextExpiresAt,
    };
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        tokenHash: this.hashToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
