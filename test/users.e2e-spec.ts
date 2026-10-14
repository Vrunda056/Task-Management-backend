import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let createUser: ReturnType<typeof vi.fn>;
  let findUsers: ReturnType<typeof vi.fn>;
  let findUser: ReturnType<typeof vi.fn>;
  let updateUser: ReturnType<typeof vi.fn>;
  let removeUser: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    createUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      createdAt,
      updatedAt,
    });
    findUsers = vi.fn().mockResolvedValue([]);
    findUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      createdAt,
      updatedAt,
    });
    updateUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
      createdAt,
      updatedAt,
    });
    removeUser = vi.fn().mockResolvedValue(undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a user and trims the input fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
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
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(createUser).toHaveBeenCalledWith({
      data: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        position: 'Engineer',
      },
    });
  });

  it('rejects invalid fields before calling Prisma', async () => {
    await request(app.getHttpServer())
      .post('/api/users')
      .send({ name: '   ', email: 'not-an-email', position: '   ' })
      .expect(400);

    expect(createUser).not.toHaveBeenCalled();
  });

  it('rejects fields that are not part of the request DTO', async () => {
    await request(app.getHttpServer())
      .post('/api/users')
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
    await request(app.getHttpServer()).get('/api/users').expect(200, []);

    const response = await request(app.getHttpServer())
      .get('/api/users/user-1')
      .expect(200);

    expect(response.body.id).toBe('user-1');
    expect(findUsers).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
    expect(findUser).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('updates and deletes a user', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/user-1')
      .send({ position: 'Principal Engineer' })
      .expect(200);
    await request(app.getHttpServer())
      .delete('/api/users/user-1')
      .expect(204);

    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { position: 'Principal Engineer' },
    });
    expect(removeUser).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('rejects empty or null-valued updates', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/user-1')
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/users/user-1')
      .send({ name: null })
      .expect(400);

    expect(updateUser).not.toHaveBeenCalled();
  });
});
