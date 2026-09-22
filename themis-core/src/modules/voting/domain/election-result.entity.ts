export interface ElectionResultOptionTally {
  optionId: string;
  voteCount: number;
}

// CU-14: snapshot inmutable del conteo final al cerrar la eleccion. Una vez
// creado no se reescribe -- idempotente via el unique de electionId.
export class ElectionResult {
  constructor(
    public readonly id: string,
    public readonly electionId: string,
    public readonly totalVotes: number,
    public readonly finalMerkleRoot: string,
    public readonly sourceBlockNumber: number,
    public readonly computedAt: Date,
    public readonly opciones: ElectionResultOptionTally[],
  ) {}
}
