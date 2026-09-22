import { Inject, Injectable, Logger } from '@nestjs/common';
import { Contract } from 'ethers';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import { BlockchainService } from '../../../shared/blockchain/blockchain.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
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
    private readonly prisma: PrismaService,
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

      // Si tenemos ThemisVoting desplegado usamos castVote; si es SemaphoreRegistry directo usamos validateProof
      const tx = votingAddress
        ? await contract.castVote(BigInt(groupId), formattedProof)
        : await contract.validateProof(BigInt(groupId), formattedProof);

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

  async syncPendingCommitments(
    electionId: string,
    onChainGroupId: string,
  ): Promise<void> {
    const registryAddress = this.config.chain.semaphoreRegistryAddress;
    if (!registryAddress) return;

    const pendingRows = await this.prisma.presentedCredential.findMany({
      where: { electionId, status: 'PENDING' },
    });

    if (pendingRows.length === 0) return;

    try {
      const wallet = this.blockchain.getWallet();
      const registry = new Contract(
        registryAddress,
        [
          'function createGroup(address admin, uint256 merkleTreeDuration) returns (uint256)',
          'function groupCounter() view returns (uint256)',
          'function addMembers(uint256 groupId, uint256[] identityCommitments)',
          'function getMerkleTreeRoot(uint256 groupId) view returns (uint256)',
          'function hasMember(uint256 groupId, uint256 identityCommitment) view returns (bool)',
        ],
        wallet,
      );

      const groupId = BigInt(onChainGroupId);
      let counter = (await registry.groupCounter()) as bigint;
      while (counter <= groupId) {
        this.logger.log(`Creando grupo ${counter} faltante en blockchain para sincronizar elección...`);
        const txCreate = await registry.createGroup(wallet.address, 3600n);
        await txCreate.wait();
        counter = (await registry.groupCounter()) as bigint;
      }

      for (const row of pendingRows) {
        const commitmentBigInt = BigInt(row.commitment);
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
        await this.prisma.presentedCredential.update({
          where: { id: row.id },
          data: { status: 'INSERTED' },
        });
      }

      const newRoot = (await registry.getMerkleTreeRoot(groupId)) as bigint;
      await this.prisma.election.update({
        where: { id: electionId },
        data: { merkleRoot: newRoot.toString() },
      });
      this.logger.log(
        `Auto-reconciliados ${pendingRows.length} commitments pendientes on-chain para eleccion ${electionId}`,
      );
    } catch (err) {
      this.logger.warn(
        `No se pudo sincronizar commitments pendientes para eleccion ${electionId}: ${(err as Error).message}`,
      );
    }
  }
}
