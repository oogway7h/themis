import { ChainSyncState } from '../../src/modules/voting/domain/chain-sync-state.entity';
import type { ChainSyncStateRepository } from '../../src/modules/voting/domain/chain-sync-state.repository';

export class InMemoryChainSyncStateRepository implements ChainSyncStateRepository {
  private readonly rows = new Map<string, ChainSyncState>();
  private sequence = 0;

  async findByElection(electionId: string): Promise<ChainSyncState | null> {
    return this.rows.get(electionId) ?? null;
  }

  async upsert(electionId: string, lastSyncedBlock: number): Promise<ChainSyncState> {
    const existing = this.rows.get(electionId);
    const row = existing
      ? new ChainSyncState(existing.id, electionId, lastSyncedBlock, new Date())
      : new ChainSyncState(`sync-${(this.sequence += 1)}`, electionId, lastSyncedBlock, new Date());
    this.rows.set(electionId, row);
    return row;
  }
}
