import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Election } from '../domain/election.entity';
import type {
  CheckpointPolicyRepository,
  ConfigureCheckpointPolicyInput,
} from '../domain/checkpoint-policy.repository';
import { electionToDomain } from './election.mapper';

@Injectable()
export class PrismaCheckpointPolicyRepository implements CheckpointPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async configure(
    electionId: string,
    input: ConfigureCheckpointPolicyInput,
    updatedBy: string,
  ): Promise<Election> {
    const row = await this.prisma.election.update({
      where: { id: electionId },
      data: { ...input, checkpointPolicyConfiguradoEn: new Date(), updatedBy },
      include: { opciones: true },
    });

    return electionToDomain(row);
  }
}
