import { ChainSyncState } from './chain-sync-state.entity';

export interface ChainSyncStateRepository {
  findByElection(electionId: string): Promise<ChainSyncState | null>;
  /** Crea la fila si no existe, o actualiza lastSyncedBlock si existe. */
  upsert(electionId: string, lastSyncedBlock: number): Promise<ChainSyncState>;
}

export const CHAIN_SYNC_STATE_REPOSITORY = 'CHAIN_SYNC_STATE_REPOSITORY';
