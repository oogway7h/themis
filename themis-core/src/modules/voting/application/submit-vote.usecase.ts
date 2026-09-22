import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
} from '../../elections/domain/election.repository';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import {
  VOTE_SUBMISSION_REPOSITORY,
  VoteSubmissionRepository,
} from '../domain/vote-submission.repository';
import {
  SemaphoreProofInput,
  VOTE_ONCHAIN_PORT,
  VoteOnChainError,
  VoteOnChainPort,
} from '../domain/vote-onchain.port';
import { assertGroupReady, assertVotingWindowOpen } from './voting-validation';
import {
  VoteAlreadyCastError,
  VoteInvalidProofError,
  VoteOptionNotFoundError,
  VoteScopeMismatchError,
} from './voting.errors';

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

export interface SubmitVoteResult {
  onChainTxHash: string;
}

/**
 * CU-10: emite un voto. Sin auth (regla 1 del CLAUDE.md raiz) -- la prueba
 * zk-SNARK valida es la unica prueba de habilitacion, igual espiritu que
 * PresentCredentialUseCase (CU-05). El contrato no valida fechas/estado de
 * la eleccion, asi que eso se hace aca antes de relayar.
 */
@Injectable()
export class SubmitVoteUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(VOTE_SUBMISSION_REPOSITORY)
    private readonly voteSubmissionRepository: VoteSubmissionRepository,
    @Inject(VOTE_ONCHAIN_PORT)
    private readonly onChain: VoteOnChainPort,
  ) {}

  async execute(electionId: string, proof: SemaphoreProofInput): Promise<SubmitVoteResult> {
    const election = await this.electionRepository.findById(electionId);
    if (!election) {
      throw new ElectionNotFoundError();
    }

    assertVotingWindowOpen(election);
    assertGroupReady(election);

    if (proof.scope !== election.onChainGroupId) {
      throw new VoteScopeMismatchError();
    }

    const option = election.opciones.find(
      (candidate) => candidate.onChainIndex === Number(proof.message),
    );
    if (!option) {
      throw new VoteOptionNotFoundError();
    }

    const result = await this.callOnChain(election.onChainGroupId as string, proof);

    try {
      await this.voteSubmissionRepository.create({
        electionId,
        optionId: option.id,
        nullifier: proof.nullifier,
        merkleTreeRoot: proof.merkleTreeRoot,
        scope: proof.scope,
        source: 'RELAY',
        onChainTxHash: result.txHash,
        blockNumber: result.blockNumber,
      });
    } catch (error) {
      // La tx on-chain ya confirmo: una carrera concurrente que persistio
      // primero no es un error de negocio, es el mismo voto.
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }

    return { onChainTxHash: result.txHash };
  }

  private async callOnChain(groupId: string, proof: SemaphoreProofInput) {
    try {
      return await this.onChain.validateProof(groupId, proof);
    } catch (error) {
      if (error instanceof VoteOnChainError) {
        if (error.kind === 'NULLIFIER_REUSED') {
          throw new VoteAlreadyCastError();
        }
        if (error.kind === 'INVALID_PROOF') {
          throw new VoteInvalidProofError();
        }
      }
      throw error;
    }
  }
}
