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

  beforeEach(async () => {
    create = vi.fn();
    module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: { user: { create } },
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
    };
    const user = {
      id: 'user-1',
      name: input.name,
      email: input.email,
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
      service.create({ name: 'Ada Lovelace', email: 'ada@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows unexpected database errors', async () => {
    const error = new Error('Database unavailable');
    create.mockRejectedValue(error);

    await expect(
      service.create({ name: 'Ada Lovelace', email: 'ada@example.com' }),
    ).rejects.toBe(error);
  });
});
