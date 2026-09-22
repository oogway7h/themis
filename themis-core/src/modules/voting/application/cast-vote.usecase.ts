import { createHmac } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import { VerifyMockAssertionUseCase } from '../../mock-sso/application/verify-mock-assertion.usecase';
import {
  VOTING_REPOSITORY,
  type VotingRepository,
} from '../domain/voting.repository';
import {
  ElectionNotFoundError,
  ElectionNotOpenForVotingError,
  OptionNotFoundError,
  DuplicateVoteError,
} from '../domain/voting.errors';
import {
  VotingOnChainService,
  type OnChainVoteProof,
} from '../infrastructure/voting-onchain.service';
import type { VoteReceiptEntity } from '../domain/vote-receipt.entity';

export interface CastVoteInput {
  electionId: string;
  optionId: string;
  proof: OnChainVoteProof;
  assertion?: string;
}

@Injectable()
export class CastVoteUseCase {
  private readonly logger = new Logger(CastVoteUseCase.name);

  constructor(
    @Inject(VOTING_REPOSITORY)
    private readonly votingRepository: VotingRepository,
    private readonly onChainService: VotingOnChainService,
    @Optional() private readonly verifyMockAssertion?: VerifyMockAssertionUseCase,
    @Optional() @Inject(APP_CONFIG) private readonly config?: AppConfig,
  ) {}

  async execute(input: CastVoteInput): Promise<VoteReceiptEntity> {
    const election = await this.votingRepository.findPublicElectionById(
      input.electionId,
    );
    if (!election) {
      throw new ElectionNotFoundError();
    }

    if (election.estado !== 'VOTACION_ABIERTA') {
      throw new ElectionNotOpenForVotingError();
    }

    const optionExists = election.opciones.some((o) => o.id === input.optionId);
    if (!optionExists) {
      throw new OptionNotFoundError();
    }

    if (!election.onChainGroupId) {
      throw new ElectionNotOpenForVotingError(
        'La elección no tiene un grupo Semaphore inicializado on-chain',
      );
    }

    this.logger.log(
      `Emitiendo voto: electionId=${input.electionId}, optionId=${input.optionId}, assertion=${input.assertion ? 'SI' : 'NO'}`,
    );

    // Verificación de participación del elector si viene assertion
    let scopedTokenHash: string | null = null;
    if (input.assertion && this.verifyMockAssertion && this.config) {
      const verification = this.verifyMockAssertion.execute({ assertion: input.assertion, ignoreExpiry: true });
      if (verification.valid) {
        scopedTokenHash = createHmac('sha256', this.config.ssoMock.secret)
          .update(`${verification.sub}:${input.electionId}`)
          .digest('hex');

        const alreadyVoted = await this.votingRepository.hasVoterVoted(
          input.electionId,
          scopedTokenHash,
        );
        if (alreadyVoted) {
          throw new DuplicateVoteError('Este elector ya ha emitido su voto en esta elección');
        }
      }
    }

    // Verificación rápida en base de datos para evitar gastar gas si el nullifier ya se vio
    const existingReceipt =
      await this.votingRepository.findVoteReceiptByNullifier(
        input.proof.nullifier,
      );
    if (existingReceipt) {
      throw new DuplicateVoteError();
    }

    // Enviar transacción a blockchain vía Relayer (verificación on-chain de Semaphore)
    const onChainResult = await this.onChainService.castVote(
      election.onChainGroupId,
      input.proof,
    );

    // Guardar el recibo anónimo en base de datos (desacoplado de la identidad)
    const receipt = await this.votingRepository.saveVoteReceipt({
      electionId: input.electionId,
      optionId: input.optionId,
      nullifier: input.proof.nullifier,
      txHash: onChainResult.txHash,
    });

    // Asentar en el padrón electoral que este elector ya votó (sin vincular a la opción ni nullifier)
    if (scopedTokenHash) {
      this.logger.log(`Asentando voto en padrón para hash ${scopedTokenHash.substring(0, 10)}...`);
      await this.votingRepository.markVoterHasVoted(input.electionId, scopedTokenHash);
    }

    return receipt;
  }
}
