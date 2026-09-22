import { Inject, Injectable, Logger } from '@nestjs/common';
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
}

/**
 * CU-10: emite un voto. Sin ningun dato de identidad (regla 1 del CLAUDE.md
 * raiz) -- la prueba zk-SNARK valida es la unica prueba de habilitacion,
 * mismo espiritu que PresentCredentialUseCase de CU-05.
 *
 * Antes recibia la `assertion` del SSO para asentar la participacion del
 * elector: eso ponia en la misma peticion quien vota y que vota, y persistia
 * la marca de tiempo de ambos lados. Se quito junto con la tabla
 * `voter_participations`; el doble voto lo sigue impidiendo el nullifier
 * on-chain, que es la defensa real.
 */
@Injectable()
export class CastVoteUseCase {
  private readonly logger = new Logger(CastVoteUseCase.name);

  constructor(
    @Inject(VOTING_REPOSITORY)
    private readonly votingRepository: VotingRepository,
    private readonly onChainService: VotingOnChainService,
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

    // La opcion se deriva de `proof.message`, que es lo que el circuito firmo
    // y lo que el contrato emite en ProofValidated -- no del `optionId` que
    // manda el cliente, que no esta atado a la prueba y podia hacer que el
    // recibo dijera una opcion distinta de la votada. Mismo criterio que
    // SubmitVoteUseCase (CU-10 por relay).
    const option = election.opciones.find(
      (candidate) => candidate.onChainIndex === Number(input.proof.message),
    );
    if (!option) {
      throw new OptionNotFoundError();
    }

    if (!election.onChainGroupId) {
      throw new ElectionNotOpenForVotingError(
        'La elección no tiene un grupo Semaphore inicializado on-chain',
      );
    }

    // Verificacion rapida en base de datos para no gastar gas si el nullifier
    // ya se vio. El rechazo definitivo lo hace el contrato.
    const existingReceipt =
      await this.votingRepository.findVoteReceiptByNullifier(
        input.proof.nullifier,
      );
    if (existingReceipt) {
      throw new DuplicateVoteError();
    }

    const onChainResult = await this.onChainService.castVote(
      election.onChainGroupId,
      input.proof,
    );

    // Recibo anonimo: no hay ninguna columna que lo conecte con el registro
    // ni con la identidad real.
    const receipt = await this.votingRepository.saveVoteReceipt({
      electionId: input.electionId,
      optionId: option.id,
      nullifier: input.proof.nullifier,
      txHash: onChainResult.txHash,
    });

    this.logger.log(`Voto emitido para election=${input.electionId}`);

    return receipt;
  }
}
