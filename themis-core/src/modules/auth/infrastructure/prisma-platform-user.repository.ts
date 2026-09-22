import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PlatformUser } from '../domain/platform-user.entity';
import {
  CreatePlatformUserInput,
  FindAllActiveParams,
  FindAllActiveResult,
  PlatformUserRepository,
  UpdatePlatformUserInput,
} from '../domain/platform-user.repository';

@Injectable()
export class PrismaPlatformUserRepository implements PlatformUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<PlatformUser | null> {
    const row = await this.prisma.platformUser.findUnique({ where: { email } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<PlatformUser | null> {
    const row = await this.prisma.platformUser.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async create(input: CreatePlatformUserInput): Promise<PlatformUser> {
    const row = await this.prisma.platformUser.create({ data: input });
    return this.toDomain(row);
  }

  async findAllActive(params: FindAllActiveParams): Promise<FindAllActiveResult> {
    const where = {
      isActive: true,
      email: params.email ? { contains: params.email, mode: 'insensitive' as const } : undefined,
      role: params.role,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.platformUser.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.platformUser.count({ where }),
    ]);

    return { items: rows.map((row) => this.toDomain(row)), total };
  }

  async update(
    id: string,
    input: UpdatePlatformUserInput,
  ): Promise<PlatformUser | null> {
    const existing = await this.prisma.platformUser.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const row = await this.prisma.platformUser.update({ where: { id }, data: input });
    return this.toDomain(row);
  }

  async softDelete(id: string): Promise<PlatformUser | null> {
    const existing = await this.prisma.platformUser.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const row = await this.prisma.platformUser.update({
      where: { id },
      data: { isActive: false },
    });
    return this.toDomain(row);
  }

  private toDomain(row: {
    id: string;
    email: string;
    passwordHash: string;
    nombreCompleto: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
  }): PlatformUser {
    return new PlatformUser(
      row.id,
      row.email,
      row.passwordHash,
      row.nombreCompleto,
      row.role as PlatformUser['role'],
      row.isActive,
      row.createdAt,
    );
  }
}
