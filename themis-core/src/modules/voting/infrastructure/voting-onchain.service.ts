import { Inject, Injectable, Logger } from '@nestjs/common';
import { Contract } from 'ethers';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import { BlockchainService } from '../../../shared/blockchain/blockchain.service';
import { InvalidProofError, DuplicateVoteError } from '../domain/voting.errors';

const SEMAPHORE_VOTING_ABI = [
  'function validateProof(uint256 groupId, tuple(uint256 merkleTreeDepth, uint256 merkleTreeRoot, uint256 nullifier, uint256 message, uint256 scope, uint256[8] points) proof) external',
  'function castVote(uint256 groupId, tuple(uint256 merkleTreeDepth, uint256 merkleTreeRoot, uint256 nullifier, uint256 message, uint256 scope, uint256[8] points) proof) external',
  'function getVotes(uint256 groupId, uint256 optionId) external view returns (uint256)',
  'function getTotalVotes(uint256 groupId) external view returns (uint256)',
];

export interface OnChainVoteProof {
  merkleTreeDepth: string | number;
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
  points: string[];
}

export interface CastVoteOnChainResult {
  txHash: string;
  blockNumber: number;
}

@Injectable()
export class VotingOnChainService {
  private readonly logger = new Logger(VotingOnChainService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly blockchain: BlockchainService,
  ) {}

  async castVote(
    groupId: string,
    proof: OnChainVoteProof,
  ): Promise<CastVoteOnChainResult> {
    const votingAddress = this.config.chain.votingContractAddress;
    const registryAddress = this.config.chain.semaphoreRegistryAddress;

    const targetAddress = votingAddress || registryAddress;
    if (!targetAddress) {
      throw new Error(
        'Ni VOTING_CONTRACT_ADDRESS ni SEMAPHORE_REGISTRY_ADDRESS están configurados en el backend',
      );
    }

    const contract = new Contract(
      targetAddress,
      SEMAPHORE_VOTING_ABI,
      this.blockchain.getWallet(),
    );

    const formattedProof = {
      merkleTreeDepth: BigInt(proof.merkleTreeDepth),
      merkleTreeRoot: BigInt(proof.merkleTreeRoot),
      nullifier: BigInt(proof.nullifier),
      message: BigInt(proof.message),
      scope: BigInt(proof.scope),
      points: proof.points.map((p) => BigInt(p)),
    };

    try {
      this.logger.log(
        `Enviando voto on-chain: groupId=${groupId}, nullifier=${proof.nullifier}`,
      );

      // Si tenemos ThemisVoting desplegado usamos castVote; si es SemaphoreRegistry directo usamos validateProof.
      // Serializado: hay una sola wallet relayer, y dos votos concurrentes
      // leerian el mismo nonce.
      const tx = await this.blockchain.sendSerialized(
        `castVote(group=${groupId})`,
        () =>
          votingAddress
            ? contract.castVote(BigInt(groupId), formattedProof)
            : contract.validateProof(BigInt(groupId), formattedProof),
      );

      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      this.logger.error(`Fallo on-chain al emitir voto: ${error.message}`);
      const errStr = String(error?.message || '');

      if (
        errStr.includes('Semaphore__YouAreUsingTheSameNullifierTwice') ||
        errStr.includes('SameNullifierTwice')
      ) {
        throw new DuplicateVoteError();
      }

      if (
        errStr.includes('Semaphore__InvalidProof') ||
        errStr.includes('InvalidProof') ||
        errStr.includes('MerkleTreeRootIsNotPartOfTheGroup')
      ) {
        throw new InvalidProofError(
          'La prueba de conocimiento cero no es válida o la raíz de Merkle no pertenece al grupo',
        );
      }

      throw error;
    }
  }
}
