import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
} from '../../elections/domain/election.repository';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import {
  VOTE_SUBMISSION_REPOSITORY,
  VoteSubmissionRepository,
  VoteSubmissionSourceCounts,
} from '../domain/vote-submission.repository';
import {
  CHAIN_SYNC_STATE_REPOSITORY,
  ChainSyncStateRepository,
} from '../domain/chain-sync-state.repository';
import {
  ELECTION_RESULT_REPOSITORY,
  ElectionResultRepository,
} from '../domain/election-result.repository';
import { GetLiveTallyUseCase, TallyOption } from './get-live-tally.usecase';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import type { VoteSubmissionSource } from '../domain/vote-submission.entity';

export interface AuditFinalResult {
  totalVotes: number;
  finalMerkleRoot: string;
  sourceBlockNumber: number;
  computedAt: Date;
}

export interface AuditChainSync {
  lastSyncedBlock: number;
  updatedAt: Date;
}

export interface AuditVote {
  nullifier: string;
  optionNombre: string;
  source: VoteSubmissionSource;
  onChainTxHash: string | null;
  blockNumber: number | null;
  submittedAt: Date;
}

/** Datos publicos para que el auditor verifique en el explorador de bloques. */
export interface AuditChainInfo {
  chainId: number;
  explorerUrl: string | null;
  registryAddress: string | null;
  groupId: string | null;
}

export interface AuditResult {
  electionId: string;
  estado: string;
  result: AuditFinalResult | null;
  liveTally: TallyOption[];
  chainSync: AuditChainSync | null;
  voteSubmissionCounts: VoteSubmissionSourceCounts;
  votes: AuditVote[];
  chain: AuditChainInfo;
}

/**
 * CU-15: vista de auditoria de una eleccion -- resultado final (si ya
 * cerro), tally en vivo, y estado de la sincronizacion on-chain, incluida
 * la proporcion relay/chain-sync como senal de cuanto tuvo que recuperar la
 * red de seguridad. Solo ADMIN/AUDITOR (ver AuditController).
 */
@Injectable()
export class GetAuditResultUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(VOTE_SUBMISSION_REPOSITORY)
    private readonly voteSubmissionRepository: VoteSubmissionRepository,
    @Inject(CHAIN_SYNC_STATE_REPOSITORY)
    private readonly chainSyncStateRepository: ChainSyncStateRepository,
    @Inject(ELECTION_RESULT_REPOSITORY)
    private readonly electionResultRepository: ElectionResultRepository,
    private readonly getLiveTally: GetLiveTallyUseCase,
    @Inject(APP_CONFIG)
    private readonly config: AppConfig,
  ) {}

  async execute(electionId: string): Promise<AuditResult> {
    const election = await this.electionRepository.findById(electionId);
    if (!election) {
      throw new ElectionNotFoundError();
    }

    const [result, tally, chainSync, voteSubmissionCounts, votes] = await Promise.all([
      this.electionResultRepository.findByElection(electionId),
      this.getLiveTally.execute(electionId),
      this.chainSyncStateRepository.findByElection(electionId),
      this.voteSubmissionRepository.countBySource(electionId),
      this.voteSubmissionRepository.listByElection(electionId),
    ]);
    const optionNames = new Map(election.opciones.map((option) => [option.id, option.nombre]));

    return {
      electionId: election.id,
      estado: election.estado,
      result: result
        ? {
            totalVotes: result.totalVotes,
            finalMerkleRoot: result.finalMerkleRoot,
            sourceBlockNumber: result.sourceBlockNumber,
            computedAt: result.computedAt,
          }
        : null,
      liveTally: tally.opciones,
      chainSync: chainSync
        ? { lastSyncedBlock: chainSync.lastSyncedBlock, updatedAt: chainSync.updatedAt }
        : null,
      voteSubmissionCounts,
      // Todo esto ya es publico on-chain (evento ProofValidated): no agrega
      // nada que permita ligar identidad con voto (regla 2).
      votes: votes.map((vote) => ({
        nullifier: vote.nullifier,
        optionNombre: optionNames.get(vote.optionId) ?? vote.optionId,
        source: vote.source,
        onChainTxHash: vote.onChainTxHash,
        blockNumber: vote.blockNumber,
        submittedAt: vote.submittedAt,
      })),
      chain: {
        chainId: this.config.chain.chainId,
        explorerUrl: this.config.chain.explorerUrl || null,
        registryAddress: this.config.chain.semaphoreRegistryAddress || null,
        groupId: election.onChainGroupId,
      },
    };
  }
}
