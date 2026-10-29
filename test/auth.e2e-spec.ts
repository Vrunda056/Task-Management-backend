import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PasswordHasherService } from '../src/auth/services/password-hasher.service.js';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let createUser: ReturnType<typeof vi.fn>;
  let findUser: ReturnType<typeof vi.fn>;
  let createRefreshSession: ReturnType<typeof vi.fn>;
  let findRefreshSession: ReturnType<typeof vi.fn>;
  let updateRefreshSession: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const passwordHash = await new PasswordHasherService().hash(
      'a-secure-passphrase',
    );
    createUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      role: 'DEVELOPER',
      sheetUrl: null,
      createdAt,
      updatedAt,
    });
    findUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      role: 'DEVELOPER',
      sheetUrl: null,
      createdAt,
      updatedAt,
      passwordHash,
    });
    createRefreshSession = vi.fn().mockResolvedValue({ id: 'session-1' });
    findRefreshSession = vi.fn();
    updateRefreshSession = vi.fn().mockResolvedValue({ count: 1 });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) =>
          key === 'JWT_SECRET' ? 'e2e-jwt-secret-with-more-than-32-bytes' : undefined,
      })
      .overrideProvider(PrismaService)
      .useValue({
        user: { create: createUser, findUnique: findUser },
        refreshSession: {
          create: createRefreshSession,
          findUnique: findRefreshSession,
          updateMany: updateRefreshSession,
        },
        $connect: vi.fn(),
        $disconnect: vi.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.use(cookieParser());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers a user using a hash and returns only profile fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        position: 'Engineer',
        password: 'a-secure-passphrase',
      })
      .expect(201);

    expect(response.body).toEqual({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      role: 'DEVELOPER',
      sheetUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(createUser).toHaveBeenCalledWith({
      data: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        position: 'Engineer',
        passwordHash: expect.stringContaining('$argon2id$'),
      },
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        role: true,
        sheetUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('rejects a client-supplied role during registration', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        position: 'Engineer',
        password: 'a-secure-passphrase',
        role: 'MANAGER',
      })
      .expect(400);

    expect(createUser).not.toHaveBeenCalled();
  });

  it('rejects passwords shorter than 12 characters', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        position: 'Engineer',
        password: 'short',
      })
      .expect(400);

    expect(createUser).not.toHaveBeenCalled();
  });

  it('verifies credentials and returns a bearer token with the profile', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: ' ada@example.com ',
        password: 'a-secure-passphrase',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      user: {
        id: 'user-1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        position: 'Engineer',
        role: 'DEVELOPER',
        sheetUrl: null,
      },
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    await expect(
      app.get(JwtService).verifyAsync(response.body.accessToken, {
        secret: 'e2e-jwt-secret-with-more-than-32-bytes',
      }),
    ).resolves.toMatchObject({ sub: 'user-1', role: 'DEVELOPER' });
    const setCookie = response.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toContain('refresh_token=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/api/auth');
    expect(response.body).not.toHaveProperty('refreshToken');
    expect(createRefreshSession).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      },
      select: { id: true },
    });
    expect(findUser).toHaveBeenCalledWith({
      where: { email: 'ada@example.com' },
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        role: true,
        sheetUrl: true,
        createdAt: true,
        updatedAt: true,
        passwordHash: true,
      },
    });
  });

  it('does not issue a token for invalid credentials', async () => {
    findUser.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'missing@example.com',
        password: 'a-secure-passphrase',
      })
      .expect(401);

    expect(response.body.message).toBe('Invalid email or password.');
    expect(createRefreshSession).not.toHaveBeenCalled();
  });

  it('rotates the refresh cookie and returns a new access token', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    findRefreshSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      expiresAt,
      revokedAt: null,
    });
    findUser.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      role: 'DEVELOPER',
      sheetUrl: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=old-refresh-token')
      .expect(200);

    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      user: { id: 'user-1', email: 'ada@example.com' },
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('refreshToken');
    expect(updateRefreshSession).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'session-1',
          revokedAt: null,
        }),
        data: expect.objectContaining({
          tokenHash: expect.any(String),
        }),
      }),
    );
    expect(response.headers['set-cookie']?.[0]).toContain('refresh_token=');
  });

  it('rejects refresh requests without a refresh cookie', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .expect(401);
    expect(findRefreshSession).not.toHaveBeenCalled();
  });

  it('revokes a session on logout and clears its cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', 'refresh_token=old-refresh-token')
      .expect(204);

    expect(updateRefreshSession).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.any(String),
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    const setCookie = response.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toContain('refresh_token=;');
    expect(setCookie).toContain('Path=/api/auth');
  });
});
