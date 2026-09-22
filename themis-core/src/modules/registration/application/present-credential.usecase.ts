import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Contract } from 'ethers';
import { ELECTION_REPOSITORY, ElectionRepository } from '../../elections/domain/election.repository';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import {
  PRESENTED_CREDENTIAL_REPOSITORY,
  PresentedCredentialRepository,
} from '../domain/presented-credential.repository';
import { PresentedCredential, PresentedCredentialStatus } from '../domain/presented-credential.entity';
import { RegistrationSigningService } from '../infrastructure/registration-signing.service';
import { assertElectionNotClosed } from './registration-validation';
import { CredentialAlreadyPresentedError, CredentialInvalidSignatureError } from './registration.errors';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import { BlockchainService } from '../../../shared/blockchain/blockchain.service';

export interface PresentCredentialInput {
  preparedMessage: string;
  signature: string;
}

// RFC 9474 (modo Randomized, el unico que usa este proyecto): el mensaje
// realmente firmado es `random(32 bytes) || mensaje original`. El commitment
// real se extrae recortando ese prefijo - no hace falta que el cliente lo
// mande aparte, y confiar en el solo tiene sentido una vez que la firma ya
// verifico contra ese mismo preparedMessage.
const RANDOMIZED_PREFIX_BYTES = 32;

function extractCommitment(preparedMessageBase64: string): string {
  const preparedMessage = Buffer.from(preparedMessageBase64, 'base64');
  return preparedMessage.subarray(RANDOMIZED_PREFIX_BYTES).toString('utf8');
}

@Injectable()
export class PresentCredentialUseCase {
  private readonly logger = new Logger(PresentCredentialUseCase.name);

  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(PRESENTED_CREDENTIAL_REPOSITORY)
    private readonly presentedCredentialRepository: PresentedCredentialRepository,
    private readonly registrationSigning: RegistrationSigningService,
    @Optional() private readonly blockchain?: BlockchainService,
    @Optional() @Inject(APP_CONFIG) private readonly config?: AppConfig,
  ) {}

  async execute(
    electionId: string,
    input: PresentCredentialInput,
  ): Promise<PresentedCredential> {
    const election = await this.electionRepository.findById(electionId);
    if (!election) {
      throw new ElectionNotFoundError();
    }
    assertElectionNotClosed(election);

    const isValid = await this.registrationSigning.verify(
      input.preparedMessage,
      input.signature,
    );
    if (!isValid) {
      throw new CredentialInvalidSignatureError();
    }

    const commitment = extractCommitment(input.preparedMessage);

    const existing = await this.presentedCredentialRepository.findByElectionAndCommitment(
      electionId,
      commitment,
    );
    if (existing && existing.status === 'INSERTED') {
      return existing;
    }

    let status: PresentedCredentialStatus = 'PENDING';
    if (
      election.onChainGroupId &&
      this.config?.chain?.semaphoreRegistryAddress &&
      this.blockchain
    ) {
      try {
        const wallet = this.blockchain.getWallet();
        const registry = new Contract(
          this.config.chain.semaphoreRegistryAddress,
          [
            'function addMembers(uint256 groupId, uint256[] identityCommitments)',
            'function getMerkleTreeRoot(uint256 groupId) view returns (uint256)',
            'function hasMember(uint256 groupId, uint256 identityCommitment) view returns (bool)',
          ],
          wallet,
        );

        const groupId = BigInt(election.onChainGroupId);
        const commitmentBigInt = BigInt(commitment);

        const alreadyMember = await registry.hasMember(groupId, commitmentBigInt);
        if (!alreadyMember) {
          const nonce = await this.blockchain
            .getProvider()
            .getTransactionCount(wallet.address, 'latest');
          const tx = await registry.addMembers(groupId, [commitmentBigInt], {
            nonce,
          });
          await tx.wait();
        }

        const newRoot = (await registry.getMerkleTreeRoot(groupId)) as bigint;
        await this.electionRepository.setMerkleRoot(electionId, newRoot.toString());
        status = 'INSERTED';
      } catch (err) {
        this.logger.warn(
          `No se pudo auto-insertar commitment on-chain para eleccion ${electionId}: ${(err as Error).message}`,
        );
      }
    }

    if (existing) {
      if (status === 'INSERTED' && existing.status !== 'INSERTED') {
        return this.presentedCredentialRepository.updateStatus(
          electionId,
          commitment,
          'INSERTED',
        );
      }
      return existing;
    }

    try {
      return await this.presentedCredentialRepository.create({
        electionId,
        commitment,
        preparedMessage: input.preparedMessage,
        signature: input.signature,
        status,
      });
    } catch {
      const concurrentExisting =
        await this.presentedCredentialRepository.findByElectionAndCommitment(
          electionId,
          commitment,
        );
      if (concurrentExisting) {
        if (status === 'INSERTED' && concurrentExisting.status !== 'INSERTED') {
          return this.presentedCredentialRepository.updateStatus(
            electionId,
            commitment,
            'INSERTED',
          );
        }
        return concurrentExisting;
      }
      throw new CredentialAlreadyPresentedError();
    }
  }
}
