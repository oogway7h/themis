// CU-10: shape exacto que espera Semaphore.validateProof (SemaphoreProof
// struct de ISemaphore.sol) -- coincide 1:1 con lo que devuelve
// @semaphore-protocol/proof generateProof() del lado del cliente.
export interface SemaphoreProofInput {
  merkleTreeDepth: number;
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
  /** 8 elementos (proof Groth16 empaquetado, packGroth16Proof). */
  points: string[];
}

export interface ValidateProofResult {
  txHash: string;
  blockNumber: number;
}

export interface OnChainVoteEvent {
  nullifier: string;
  message: string;
  merkleTreeRoot: string;
  scope: string;
  blockNumber: number;
  txHash: string;
}

export type VoteOnChainErrorKind = 'NULLIFIER_REUSED' | 'INVALID_PROOF' | 'UNKNOWN';

export class VoteOnChainError extends Error {
  constructor(
    public readonly kind: VoteOnChainErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'VoteOnChainError';
  }
}

/**
 * Puerto hacia Semaphore.validateProof/eventos ProofValidated (CU-10/CU-11).
 * Distinto de SEMAPHORE_ONCHAIN_PORT (checkpoints): ese inserta miembros en
 * el arbol, este valida pruebas de voto -- ambos hablan con el mismo
 * contrato (ThemisSemaphoreRegistry hereda Semaphore.sol completo).
 */
export interface VoteOnChainPort {
  validateProof(groupId: string, proof: SemaphoreProofInput): Promise<ValidateProofResult>;
  fetchProofValidatedEvents(
    groupId: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<OnChainVoteEvent[]>;
  getCurrentBlockNumber(): Promise<number>;
}

export const VOTE_ONCHAIN_PORT = 'VOTE_ONCHAIN_PORT';
