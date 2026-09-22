// Contrato TS a mano, siguiendo RateAlertResponseDto / AuditResultResponseDto
// de themis-core (src/modules/checkpoints|voting/presentation/dto).
// TODO: reemplazar por tipos generados cuando se instale openapi-typescript.

export interface RateAlertDto {
  id: string;
  windowStart: string;
  windowEnd: string;
  registrationCount: number;
  thresholdPerMinute: number;
  severity: 'WARNING';
  createdAt: string;
}

export interface AuditFinalResultDto {
  totalVotes: number;
  finalMerkleRoot: string;
  sourceBlockNumber: number;
  computedAt: string;
}

export interface AuditChainSyncDto {
  lastSyncedBlock: number;
  updatedAt: string;
}

export interface AuditTallyOptionDto {
  optionId: string;
  nombre: string;
  voteCount: number;
}

export interface VoteSubmissionCountsDto {
  total: number;
  relay: number;
  chainSync: number;
}

export interface AuditResultDto {
  electionId: string;
  estado: string;
  result: AuditFinalResultDto | null;
  liveTally: AuditTallyOptionDto[];
  chainSync: AuditChainSyncDto | null;
  voteSubmissionCounts: VoteSubmissionCountsDto;
}
