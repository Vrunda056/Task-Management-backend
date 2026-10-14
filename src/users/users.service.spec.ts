import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let module: TestingModule;
  let create: ReturnType<typeof vi.fn>;
  let findMany: ReturnType<typeof vi.fn>;
  let findUnique: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let deleteUser: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    create = vi.fn();
    findMany = vi.fn();
    findUnique = vi.fn();
    update = vi.fn();
    deleteUser = vi.fn();
    module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: { create, findMany, findUnique, update, delete: deleteUser },
          },
        },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('creates a user with the provided data', async () => {
    const input: CreateUserDto = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      position: 'Engineer',
    };
    const user = {
      id: 'user-1',
      name: input.name,
      email: input.email,
      position: input.position,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    create.mockResolvedValue(user);

    await expect(service.create(input)).resolves.toEqual(user);
    expect(create).toHaveBeenCalledWith({ data: input });
  });

  it('converts a duplicate email into a conflict', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.10.0' },
    );
    create.mockRejectedValue(error);

    await expect(
      service.create({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        position: 'Engineer',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows unexpected database errors', async () => {
    const error = new Error('Database unavailable');
    create.mockRejectedValue(error);

    await expect(
      service.create({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        position: 'Engineer',
      }),
    ).rejects.toBe(error);
  });

  it('lists users in name order', async () => {
    findMany.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('returns a user by ID and reports missing users', async () => {
    const user = { id: 'user-1' };
    findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce(null);

    await expect(service.findOne('user-1')).resolves.toBe(user);
    await expect(service.findOne('missing')).rejects.toThrow('User not found.');
  });

  it('updates a user and reports duplicate email conflicts', async () => {
    const user = { id: 'user-1', name: 'Ada' };
    update.mockResolvedValueOnce(user).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    await expect(service.update('user-1', { name: 'Ada' })).resolves.toBe(user);
    await expect(
      service.update('user-1', { email: 'taken@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects empty updates and reports delete not-found errors', async () => {
    await expect(service.update('user-1', {})).rejects.toThrow(
      'At least one user field must be provided.',
    );
    deleteUser.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '7.10.0',
      }),
    );
    await expect(service.remove('missing')).rejects.toThrow('User not found.');
  });
});
