import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AccessTokenService } from '../src/auth/services/access-token.service.js';
import { UserRole } from '../src/generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let createUser: ReturnType<typeof vi.fn>;
  let findUsers: ReturnType<typeof vi.fn>;
  let findUser: ReturnType<typeof vi.fn>;
  let updateUser: ReturnType<typeof vi.fn>;
  let removeUser: ReturnType<typeof vi.fn>;
  let authorizationHeader: string;

  beforeEach(async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    createUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      role: UserRole.DEVELOPER,
      createdAt,
      updatedAt,
    });
    findUsers = vi.fn().mockResolvedValue([]);
    findUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      role: UserRole.DEVELOPER,
      createdAt,
      updatedAt,
    });
    updateUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      role: UserRole.DEVELOPER,
      createdAt,
      updatedAt,
    });
    removeUser = vi.fn().mockResolvedValue(undefined);

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
        user: {
          create: createUser,
          findMany: findUsers,
          findUnique: findUser,
          update: updateUser,
          delete: removeUser,
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
    await app.init();
    const token = await app
      .get(AccessTokenService)
      .issueAccessToken('user-1', UserRole.MANAGER);
    authorizationHeader = `Bearer ${token}`;
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a user and trims the input fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', authorizationHeader)
      .send({
        name: ' Ada Lovelace ',
        email: ' ada@example.com ',
        position: ' Engineer ',
      })
      .expect(201);

    expect(response.body).toEqual({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      role: UserRole.DEVELOPER,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(createUser).toHaveBeenCalledWith({
      data: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        position: 'Engineer',
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

  it('rejects invalid fields before calling Prisma', async () => {
    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', authorizationHeader)
      .send({ name: '   ', email: 'not-an-email', position: '   ' })
      .expect(400);

    expect(createUser).not.toHaveBeenCalled();
  });

  it('rejects fields that are not part of the request DTO', async () => {
    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', authorizationHeader)
      .send({
        id: 'client-chosen-id',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        position: 'Engineer',
      })
      .expect(400);

    expect(createUser).not.toHaveBeenCalled();
  });

  it('retrieves the user list and a user by ID', async () => {
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', authorizationHeader)
      .expect(200, []);

    const response = await request(app.getHttpServer())
      .get('/api/users/user-1')
      .set('Authorization', authorizationHeader)
      .expect(200);

    expect(response.body.id).toBe('user-1');
    expect(findUsers).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
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
    expect(findUser).toHaveBeenCalledWith({
      where: { id: 'user-1' },
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

  it('forbids developers from accessing user management', async () => {
    const developerToken = await app
      .get(AccessTokenService)
      .issueAccessToken('developer-1', UserRole.DEVELOPER);

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${developerToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/users/user-1')
      .set('Authorization', `Bearer ${developerToken}`)
      .send({ role: UserRole.MANAGER })
      .expect(403);

    expect(findUsers).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('allows managers to assign a valid user role', async () => {
    updateUser.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      role: UserRole.MANAGER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .patch('/api/users/user-1')
      .set('Authorization', authorizationHeader)
      .send({ role: UserRole.MANAGER })
      .expect(200);

    expect(response.body.role).toBe(UserRole.MANAGER);
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: UserRole.MANAGER },
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

  it('updates and deletes a user', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/user-1')
      .set('Authorization', authorizationHeader)
      .send({ position: 'Principal Engineer' })
      .expect(200);
    await request(app.getHttpServer())
      .delete('/api/users/user-1')
      .set('Authorization', authorizationHeader)
      .expect(204);

    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { position: 'Principal Engineer' },
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
    expect(removeUser).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('rejects empty or null-valued updates', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/user-1')
      .set('Authorization', authorizationHeader)
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/users/user-1')
      .set('Authorization', authorizationHeader)
      .send({ name: null })
      .expect(400);

    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects role values outside the role enum', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/user-1')
      .set('Authorization', authorizationHeader)
      .send({ role: 'ADMIN' })
      .expect(400);

    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects requests without a bearer token', async () => {
    await request(app.getHttpServer()).get('/api/users').expect(401);
    expect(findUsers).not.toHaveBeenCalled();
  });

  it('rejects invalid bearer tokens', async () => {
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);
    expect(findUsers).not.toHaveBeenCalled();
  });
});
