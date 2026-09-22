import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ChainSyncState } from '../domain/chain-sync-state.entity';
import type { ChainSyncStateRepository } from '../domain/chain-sync-state.repository';
import { chainSyncStateToDomain } from './chain-sync-state.mapper';

@Injectable()
export class PrismaChainSyncStateRepository implements ChainSyncStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByElection(electionId: string): Promise<ChainSyncState | null> {
    const row = await this.prisma.chainSyncState.findUnique({ where: { electionId } });
    return row ? chainSyncStateToDomain(row) : null;
  }

  async upsert(electionId: string, lastSyncedBlock: number): Promise<ChainSyncState> {
    const row = await this.prisma.chainSyncState.upsert({
      where: { electionId },
      create: { electionId, lastSyncedBlock },
      update: { lastSyncedBlock },
    });
    return chainSyncStateToDomain(row);
  }
}
