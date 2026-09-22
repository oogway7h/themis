import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { VoteSubmission } from '../domain/vote-submission.entity';
import type {
  CreateVoteSubmissionInput,
  OptionTallyRow,
  VoteSubmissionRepository,
  VoteSubmissionSourceCounts,
} from '../domain/vote-submission.repository';
import { voteSubmissionToDomain } from './vote-submission.mapper';

@Injectable()
export class PrismaVoteSubmissionRepository implements VoteSubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateVoteSubmissionInput): Promise<VoteSubmission> {
    const row = await this.prisma.voteSubmission.create({
      data: {
        electionId: input.electionId,
        optionId: input.optionId,
        nullifier: input.nullifier,
        merkleTreeRoot: input.merkleTreeRoot,
        scope: input.scope,
        source: input.source,
        onChainTxHash: input.onChainTxHash,
        blockNumber: input.blockNumber,
      },
    });
    return voteSubmissionToDomain(row);
  }

  async countByOption(electionId: string): Promise<OptionTallyRow[]> {
    const rows = await this.prisma.voteSubmission.groupBy({
      by: ['optionId'],
      where: { electionId },
      _count: { _all: true },
    });
    return rows.map((row) => ({ optionId: row.optionId, voteCount: row._count._all }));
  }

  async countByElection(electionId: string): Promise<number> {
    return this.prisma.voteSubmission.count({ where: { electionId } });
  }

  async countBySource(electionId: string): Promise<VoteSubmissionSourceCounts> {
    const rows = await this.prisma.voteSubmission.groupBy({
      by: ['source'],
      where: { electionId },
      _count: { _all: true },
    });
    const relay = rows.find((row) => row.source === 'RELAY')?._count._all ?? 0;
    const chainSync = rows.find((row) => row.source === 'CHAIN_SYNC')?._count._all ?? 0;
    return { total: relay + chainSync, relay, chainSync };
  }
}
