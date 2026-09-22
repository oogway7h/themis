import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Election } from '../domain/election.entity';
import type { ConfigureRollInput, RollConfigRepository } from '../domain/roll-config.repository';
import { electionToDomain } from './election.mapper';

@Injectable()
export class PrismaRollConfigRepository implements RollConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async configure(
    electionId: string,
    input: ConfigureRollInput,
    updatedBy: string,
  ): Promise<Election> {
    const row = await this.prisma.election.update({
      where: { id: electionId },
      data: { ...input, padronConfiguradoEn: new Date(), updatedBy },
      include: { opciones: true },
    });

    return electionToDomain(row);
  }
}
