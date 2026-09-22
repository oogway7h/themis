// CU-11/CU-14: puntero de sincronizacion de eventos ProofValidated leidos
// desde el grupo on-chain de la eleccion. Red de seguridad, mismo espiritu
// que RetryPendingInsertionsUseCase de CU-09.
export class ChainSyncState {
  constructor(
    public readonly id: string,
    public readonly electionId: string,
    public readonly lastSyncedBlock: number,
    public readonly updatedAt: Date,
  ) {}
}
