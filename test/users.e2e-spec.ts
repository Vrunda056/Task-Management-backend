import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let createUser: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    createUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      createdAt,
      updatedAt,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: { create: createUser },
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
      .send({ name: ' Ada Lovelace ', email: ' ada@example.com ' })
      .expect(201);

    expect(response.body).toEqual({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(createUser).toHaveBeenCalledWith({
      data: { name: 'Ada Lovelace', email: 'ada@example.com' },
    });
  });

  it('rejects invalid fields before calling Prisma', async () => {
    await request(app.getHttpServer())
      .post('/api/users')
      .send({ name: '   ', email: 'not-an-email' })
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
      })
      .expect(400);

    expect(createUser).not.toHaveBeenCalled();
  });
});
