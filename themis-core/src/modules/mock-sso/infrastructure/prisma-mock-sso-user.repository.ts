import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { MockSsoUser } from '../domain/mock-sso-user.entity';
import {
  CreateMockSsoUserInput,
  MockSsoUserRepository,
} from '../domain/mock-sso-user.repository';

@Injectable()
export class PrismaMockSsoUserRepository implements MockSsoUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCodigoInstitucional(codigo: string): Promise<MockSsoUser | null> {
    const row = await this.prisma.mockSsoUser.findUnique({
      where: { codigoInstitucional: codigo },
    });

    return row ? this.toDomain(row) : null;
  }

  async create(input: CreateMockSsoUserInput): Promise<MockSsoUser> {
    const row = await this.prisma.mockSsoUser.create({ data: input });
    return this.toDomain(row);
  }

  async list(): Promise<MockSsoUser[]> {
    const rows = await this.prisma.mockSsoUser.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: {
    id: string;
    codigoInstitucional: string;
    passwordHash: string;
    nombreCompleto: string;
    facultad: string;
    carrera: string;
    tipoUsuario: string;
    estadoAcademico: string;
    createdAt: Date;
  }): MockSsoUser {
    return new MockSsoUser(
      row.id,
      row.codigoInstitucional,
      row.passwordHash,
      row.nombreCompleto,
      row.facultad as MockSsoUser['facultad'],
      row.carrera as MockSsoUser['carrera'],
      row.tipoUsuario as MockSsoUser['tipoUsuario'],
      row.estadoAcademico as MockSsoUser['estadoAcademico'],
      row.createdAt,
    );
  }
}
