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

export interface AuditVoteDto {
  nullifier: string;
  optionNombre: string;
  source: 'RELAY' | 'CHAIN_SYNC';
  onChainTxHash: string | null;
  blockNumber: number | null;
  submittedAt: string;
}

export interface AuditChainInfoDto {
  chainId: number;
  // null en Hardhat local: no hay explorador, se muestra el hash sin link.
  explorerUrl: string | null;
  registryAddress: string | null;
  groupId: string | null;
}

export interface AuditResultDto {
  electionId: string;
  estado: string;
  result: AuditFinalResultDto | null;
  liveTally: AuditTallyOptionDto[];
  chainSync: AuditChainSyncDto | null;
  voteSubmissionCounts: VoteSubmissionCountsDto;
  votes: AuditVoteDto[];
  chain: AuditChainInfoDto;
}
