import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Authority } from '../domain/authority.entity';
import type {
  AuthorityRepository,
  DesignateAuthorityInput,
  ReplaceAuthorityInput,
} from '../domain/authority.repository';

@Injectable()
export class PrismaAuthorityRepository implements AuthorityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async designateAll(
    electionId: string,
    inputs: DesignateAuthorityInput[],
    createdBy: string,
  ): Promise<Authority[]> {
    await this.prisma.authority.createMany({
      data: inputs.map((input) => ({
        electionId,
        platformUserId: input.platformUserId,
        rolDescriptivo: input.rolDescriptivo,
        createdBy,
        updatedBy: createdBy,
      })),
    });

    return this.findByElection(electionId);
  }

  async replace(authorityId: string, input: ReplaceAuthorityInput): Promise<Authority> {
    const row = await this.prisma.authority.update({
      where: { id: authorityId },
      data: input,
    });
    return this.toDomain(row);
  }

  async findByElection(electionId: string): Promise<Authority[]> {
    const rows = await this.prisma.authority.findMany({
      where: { electionId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(authorityId: string): Promise<Authority | null> {
    const row = await this.prisma.authority.findUnique({ where: { id: authorityId } });
    return row ? this.toDomain(row) : null;
  }

  async findByPlatformUser(platformUserId: string): Promise<Authority[]> {
    const rows = await this.prisma.authority.findMany({
      where: { platformUserId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: {
    id: string;
    electionId: string;
    platformUserId: string;
    rolDescriptivo: string;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
  }): Authority {
    return new Authority(
      row.id,
      row.electionId,
      row.platformUserId,
      row.rolDescriptivo,
      row.createdAt,
      row.createdBy,
      row.updatedAt,
      row.updatedBy,
    );
  }
}
