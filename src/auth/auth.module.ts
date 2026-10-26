import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AccessTokenService } from './services/access-token.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { PasswordHasherService } from './services/password-hasher.service.js';
import { RefreshSessionService } from './services/refresh-session.service.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHasherService,
    AccessTokenService,
    RefreshSessionService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
