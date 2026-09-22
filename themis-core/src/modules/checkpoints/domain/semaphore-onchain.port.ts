export interface InsertBatchResult {
  txHash: string;
  newRoot: string;
  groupId: string;
}

/**
 * Puerto hacia la insercion real on-chain (CU-09, addMembers de Semaphore).
 * La implementacion real vive en shared/blockchain (ver
 * ThemisSemaphoreRegistry.sol) y se agrega en una fase posterior; mientras
 * tanto SEMAPHORE_ONCHAIN_PORT se liga a un stub in-memory para poder
 * desarrollar y testear el flujo de aprobacion (CU-08) de forma aislada.
 */
export interface SemaphoreOnChainPort {
  insertBatch(electionId: string, commitments: string[]): Promise<InsertBatchResult>;
}

export const SEMAPHORE_ONCHAIN_PORT = 'SEMAPHORE_ONCHAIN_PORT';
