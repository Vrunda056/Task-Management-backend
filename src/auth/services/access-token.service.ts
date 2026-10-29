import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../generated/prisma/client.js';
import { getJwtSecret } from '../utils/jwt-secret.js';

@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  issueAccessToken(userId: string, role: UserRole): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, role },
      { secret: getJwtSecret(this.configService), expiresIn: '15m' },
    );
  }
}
