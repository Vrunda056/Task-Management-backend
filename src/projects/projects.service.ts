import { Injectable , NotFoundException, ConflictException, BadRequestException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma} from '../generated/prisma/client.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProjectDto) {
    try {
      return await this.prisma.project.create({
        data,
        include: {           //By default, Prisma does not return related data. To include related data, you can use the `include` option in your query.
          createdBy: {       // so the related User record comes back in the same response object.
            select: {         //If you just used include: { createdBy: true }, Prisma would return every single field from the User model.
              id: true,      // so we use select to specify only the fields we want to return.
              name: true,
              email: true,
              position: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async findAll() {
    return this.prisma.project.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
          },
        },
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found.');
    }
    return project;
  }
  
  async update(id: string, data: UpdateProjectDto) {
    if (Object.values(data).every((value) => value === undefined)) {
      throw new BadRequestException('At least one project field must be provided.');
    }

    try {
      return await this.prisma.project.update({
        where: { id },
        data,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              position: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }
  
  async remove(id: string) {
      try {
        await this.prisma.project.delete({ where: { id } });
      } catch (error) {
        this.handleWriteError(error);
      }
  }
  
  private handleWriteError(error: unknown): never {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A project with this name already exists.');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Project not found.');
        }
    }
  
      throw error;
  }
  
}
