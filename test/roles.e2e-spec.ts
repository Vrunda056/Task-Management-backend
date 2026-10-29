import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AccessTokenService } from '../src/auth/services/access-token.service.js';
import { UserRole } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Role-based access control (e2e)', () => {
  let app: INestApplication<App>;
  let findProjects: ReturnType<typeof vi.fn>;
  let findProject: ReturnType<typeof vi.fn>;
  let createProject: ReturnType<typeof vi.fn>;
  let updateProject: ReturnType<typeof vi.fn>;
  let removeProject: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const project = {
      id: 'project-1',
      name: 'Learning project',
      description: null,
      createdById: 'manager-1',
      createdBy: {
        id: 'manager-1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        position: 'Manager',
      },
      createdAt,
      updatedAt,
    };
    findProjects = vi.fn().mockResolvedValue([]);
    findProject = vi.fn().mockResolvedValue(project);
    createProject = vi.fn().mockResolvedValue(project);
    updateProject = vi.fn().mockResolvedValue(project);
    removeProject = vi.fn().mockResolvedValue(undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) =>
          key === 'JWT_SECRET'
            ? 'e2e-jwt-secret-with-more-than-32-bytes'
            : undefined,
      })
      .overrideProvider(PrismaService)
      .useValue({
        project: {
          findMany: findProjects,
          findUnique: findProject,
          create: createProject,
          update: updateProject,
          delete: removeProject,
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

  it('allows developers to read projects', async () => {
    const token = await app
      .get(AccessTokenService)
      .issueAccessToken('developer-1', UserRole.DEVELOPER);

    await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, []);
    await request(app.getHttpServer())
      .get('/api/projects/project-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(findProjects).toHaveBeenCalledOnce();
    expect(findProject).toHaveBeenCalledOnce();
  });

  it('forbids developers from user management and project writes', async () => {
    const token = await app
      .get(AccessTokenService)
      .issueAccessToken('developer-1', UserRole.DEVELOPER);
    const authorization = `Bearer ${token}`;

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', authorization)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', authorization)
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/projects/project-1')
      .set('Authorization', authorization)
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .delete('/api/projects/project-1')
      .set('Authorization', authorization)
      .expect(403);

    expect(createProject).not.toHaveBeenCalled();
    expect(updateProject).not.toHaveBeenCalled();
    expect(removeProject).not.toHaveBeenCalled();
  });

  it('allows managers to create projects', async () => {
    const token = await app
      .get(AccessTokenService)
      .issueAccessToken('manager-1', UserRole.MANAGER);

    await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Learning project',
        createdById: 'manager-1',
      })
      .expect(201);

    expect(createProject).toHaveBeenCalledOnce();
  });
});
