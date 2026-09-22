import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ElectionResult } from '../domain/election-result.entity';
import type {
  CreateElectionResultInput,
  ElectionResultRepository,
} from '../domain/election-result.repository';
import { electionResultToDomain } from './election-result.mapper';

@Injectable()
export class PrismaElectionResultRepository implements ElectionResultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByElection(electionId: string): Promise<ElectionResult | null> {
    const row = await this.prisma.electionResult.findUnique({
      where: { electionId },
      include: { opciones: true },
    });
    return row ? electionResultToDomain(row) : null;
  }

  async create(input: CreateElectionResultInput): Promise<ElectionResult> {
    const row = await this.prisma.electionResult.create({
      data: {
        electionId: input.electionId,
        totalVotes: input.totalVotes,
        finalMerkleRoot: input.finalMerkleRoot,
        sourceBlockNumber: input.sourceBlockNumber,
        opciones: {
          create: input.opciones.map((option) => ({
            optionId: option.optionId,
            voteCount: option.voteCount,
          })),
        },
      },
      include: { opciones: true },
    });
    return electionResultToDomain(row);
  }
}
