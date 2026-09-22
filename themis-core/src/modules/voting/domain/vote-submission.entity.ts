export type VoteSubmissionSource = 'RELAY' | 'CHAIN_SYNC';

// CU-10/CU-11: un voto validado on-chain (evento ProofValidated de
// Semaphore.validateProof). Ninguna columna conecta esta fila con identidad
// real (regla 2 del CLAUDE.md raiz) -- nullifier/merkleTreeRoot ya son
// publicos on-chain por diseno de Semaphore, optionId se guarda en claro a
// proposito (solo la identidad es anonima, la distribucion de votos es
// publica).
export class VoteSubmission {
  constructor(
    public readonly id: string,
    public readonly electionId: string,
    public readonly optionId: string,
    public readonly nullifier: string,
    public readonly merkleTreeRoot: string,
    public readonly scope: string,
    public readonly source: VoteSubmissionSource,
    public readonly submittedAt: Date,
    public readonly onChainTxHash: string | null = null,
    public readonly blockNumber: number | null = null,
  ) {}
}
