import { ElectionResult, ElectionResultOptionTally } from '../domain/election-result.entity';

interface ElectionResultOptionRow {
  optionId: string;
  voteCount: number;
}

interface ElectionResultRow {
  id: string;
  electionId: string;
  totalVotes: number;
  finalMerkleRoot: string;
  sourceBlockNumber: number;
  computedAt: Date;
  opciones?: ElectionResultOptionRow[];
}

export function electionResultToDomain(row: ElectionResultRow): ElectionResult {
  const opciones: ElectionResultOptionTally[] = (row.opciones ?? []).map((option) => ({
    optionId: option.optionId,
    voteCount: option.voteCount,
  }));
  return new ElectionResult(
    row.id,
    row.electionId,
    row.totalVotes,
    row.finalMerkleRoot,
    row.sourceBlockNumber,
    row.computedAt,
    opciones,
  );
}
