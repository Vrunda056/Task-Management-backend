import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { userProfileSelect } from '../users/user-profile.select.js';
import { AccessTokenService } from './services/access-token.service.js';
import { PasswordHasherService } from './services/password-hasher.service.js';
import { RefreshSessionService } from './services/refresh-session.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly accessTokenService: AccessTokenService,
    private readonly refreshSessionService: RefreshSessionService,
  ) {}

  async register(data: RegisterDto) {
    const { password, ...profile } = data;
    const passwordHash = await this.passwordHasher.hash(password);

    try {
      return await this.prisma.user.create({
        data: { ...profile, passwordHash },
        select: userProfileSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists.');
      }

      throw error;
    }
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { ...userProfileSelect, passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const { passwordHash, ...profile } = user;
    if (
      !passwordHash ||
      !(await this.passwordHasher.verify(password, passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return profile;
  }

  async login(data: LoginDto) {
    const user = await this.validateCredentials(data.email, data.password);
    const accessToken = await this.accessTokenService.issueAccessToken(user.id);
    const refreshSession = await this.refreshSessionService.createSession(
      user.id,
    );

    return {
      accessToken,
      user,
      refreshToken: refreshSession.refreshToken,
      refreshExpiresAt: refreshSession.expiresAt,
    };
  }

  async refresh(refreshToken: string) {
    const refreshSession = await this.refreshSessionService.rotate(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: refreshSession.userId },
      select: userProfileSelect,
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const accessToken = await this.accessTokenService.issueAccessToken(user.id);
    return {
      accessToken,
      user,
      refreshToken: refreshSession.refreshToken,
      refreshExpiresAt: refreshSession.expiresAt,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.refreshSessionService.revoke(refreshToken);
    }
  }
}
