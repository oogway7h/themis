import { ChainSyncState } from '../domain/chain-sync-state.entity';

interface ChainSyncStateRow {
  id: string;
  electionId: string;
  lastSyncedBlock: number;
  updatedAt: Date;
}

export function chainSyncStateToDomain(row: ChainSyncStateRow): ChainSyncState {
  return new ChainSyncState(row.id, row.electionId, row.lastSyncedBlock, row.updatedAt);
}
