import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
} from '../../elections/domain/election.repository';
import { Election } from '../../elections/domain/election.entity';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import {
  VOTE_SUBMISSION_REPOSITORY,
  VoteSubmissionRepository,
} from '../domain/vote-submission.repository';
import {
  CHAIN_SYNC_STATE_REPOSITORY,
  ChainSyncStateRepository,
} from '../domain/chain-sync-state.repository';
import { VOTE_ONCHAIN_PORT, VoteOnChainPort } from '../domain/vote-onchain.port';

// ponytail: rango fijo, cabe en el limite de eth_getLogs de los RPC publicos
// (sepolia.base.org rechaza 2000; 1000 pasa, medido el 2026-09-30).
// Hacerlo configurable si el proveedor permite rangos mas grandes.
export const SYNC_BLOCK_RANGE = 1000;

interface PrismaKnownRequestErrorLike {
  code?: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as PrismaKnownRequestErrorLike).code === 'P2002'
  );
}

/**
 * Red de seguridad para CU-10/CU-11: recupera votos validados on-chain que
 * no quedaron persistidos por el relay sincrono de SubmitVoteUseCase (el
 * proceso murio, o un relayer alternativo mando la tx). No es el disparador
 * primario. Invocado por VotingScheduler (EVERY_MINUTE), mismo espiritu que
 * RetryPendingInsertionsUseCase de CU-09.
 */
@Injectable()
export class SyncVoteEventsUseCase {
  private readonly logger = new Logger(SyncVoteEventsUseCase.name);

  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(VOTE_SUBMISSION_REPOSITORY)
    private readonly voteSubmissionRepository: VoteSubmissionRepository,
    @Inject(CHAIN_SYNC_STATE_REPOSITORY)
    private readonly chainSyncStateRepository: ChainSyncStateRepository,
    @Inject(VOTE_ONCHAIN_PORT)
    private readonly onChain: VoteOnChainPort,
    @Inject(APP_CONFIG)
    private readonly config: AppConfig,
  ) {}

  async execute(): Promise<void> {
    const elections = await this.electionRepository.findMany({
      estados: ['VOTACION_ABIERTA', 'CERRADA'],
    });

    for (const election of elections) {
      if (election.onChainGroupId === null) {
        continue;
      }
      try {
        await this.syncElection(election);
      } catch (error) {
        this.logger.warn(
          `Fallo la sincronizacion de votos de election=${election.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async syncElection(election: Election): Promise<void> {
    const groupId = election.onChainGroupId as string;
    const syncState = await this.chainSyncStateRepository.findByElection(election.id);
    // En una red real no se puede pedir eth_getLogs desde el bloque 0: se
    // arranca en el bloque de despliegue y se avanza de a un tramo por pasada
    // (el cron corre cada minuto, un catch-up largo se completa en varias).
    const lastSyncedBlock =
      syncState?.lastSyncedBlock ?? Math.max(this.config.chain.startBlock - 1, 0);
    const currentBlock = await this.onChain.getCurrentBlockNumber();

    if (currentBlock <= lastSyncedBlock) {
      return;
    }

    const toBlock = Math.min(currentBlock, lastSyncedBlock + SYNC_BLOCK_RANGE);
    const events = await this.onChain.fetchProofValidatedEvents(
      groupId,
      lastSyncedBlock + 1,
      toBlock,
    );

    for (const event of events) {
      const option = election.opciones.find(
        (candidate) => candidate.onChainIndex === Number(event.message),
      );
      if (!option) {
        this.logger.warn(
          `Evento ProofValidated con message=${event.message} no coincide con ninguna ` +
            `opcion de election=${election.id}, se ignora`,
        );
        continue;
      }

      try {
        await this.voteSubmissionRepository.create({
          electionId: election.id,
          optionId: option.id,
          nullifier: event.nullifier,
          merkleTreeRoot: event.merkleTreeRoot,
          scope: event.scope,
          source: 'CHAIN_SYNC',
          onChainTxHash: event.txHash,
          blockNumber: event.blockNumber,
        });
      } catch (error) {
        // Ya persistido por el relay sincrono (SubmitVoteUseCase) -- no-op.
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    await this.chainSyncStateRepository.upsert(election.id, toBlock);
  }
}
