import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { userProfileSelect } from './user-profile.select.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    try {
      return await this.prisma.user.create({
        data,
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

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: userProfileSelect,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userProfileSelect,
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  async update(id: string, data: UpdateUserDto) {
    if (Object.values(data).every((value) => value === undefined)) {
      throw new BadRequestException('At least one user field must be provided.');
    }

    const payload = {
      ...data,
      ...(data.sheetUrl === '' ? { sheetUrl: null } : {}),
    };

    try {
      return await this.prisma.user.update({
        where: { id },
        data: payload,
        select: userProfileSelect,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async updateProfile(id: string, data: UpdateProfileDto) {
    if (Object.values(data).every((value) => value === undefined)) {
      throw new BadRequestException('At least one profile field must be provided.');
    }

    const payload = {
      ...data,
      ...(data.sheetUrl === '' ? { sheetUrl: null } : {}),
    };

    try {
      return await this.prisma.user.update({
        where: { id },
        data: payload,
        select: userProfileSelect,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('A user with this email already exists.');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found.');
      }
    }

    throw error;
  }
}
