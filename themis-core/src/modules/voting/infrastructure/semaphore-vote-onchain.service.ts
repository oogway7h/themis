import { Inject, Injectable } from '@nestjs/common';
import { Contract, EventLog, type TransactionReceipt } from 'ethers';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import { BlockchainService } from '../../../shared/blockchain/blockchain.service';
import {
  OnChainVoteEvent,
  SemaphoreProofInput,
  ValidateProofResult,
  VoteOnChainError,
  VoteOnChainPort,
} from '../domain/vote-onchain.port';

/**
 * Subconjunto de la ABI de Semaphore (@semaphore-protocol/contracts) que
 * ThemisSemaphoreRegistry hereda tal cual -- solo lo que este servicio usa.
 * Separado de SEMAPHORE_REGISTRY_ABI de checkpoints/ porque hace algo
 * distinto (validar pruebas de voto, no insertar miembros), aunque hablan
 * con el mismo contrato desplegado.
 */
const SEMAPHORE_VOTE_ABI = [
  'function validateProof(uint256 groupId, tuple(uint256 merkleTreeDepth, uint256 merkleTreeRoot, uint256 nullifier, uint256 message, uint256 scope, uint256[8] points) proof)',
  'event ProofValidated(uint256 indexed groupId, uint256 merkleTreeDepth, uint256 indexed merkleTreeRoot, uint256 nullifier, uint256 message, uint256 indexed scope, uint256[8] points)',
  'error Semaphore__YouAreUsingTheSameNullifierTwice()',
  'error Semaphore__InvalidProof()',
];

interface RevertDataCarrier {
  data?: string;
  info?: { error?: { data?: string } };
  error?: { data?: string };
}

@Injectable()
export class SemaphoreVoteOnChainService implements VoteOnChainPort {
  private registryInstance: Contract | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly blockchain: BlockchainService,
  ) {}

  // Perezoso, mismo motivo que en checkpoints/semaphore-onchain.service.ts:
  // un .env sin SEMAPHORE_REGISTRY_ADDRESS no debe impedir que el backend
  // arranque.
  private get registry(): Contract {
    if (!this.registryInstance) {
      const address = this.config.chain.semaphoreRegistryAddress;
      if (!address) {
        throw new Error(
          'SEMAPHORE_REGISTRY_ADDRESS no esta configurado -- corre ' +
            'pnpm chain:deploy:semaphore:local y pega la direccion en .env',
        );
      }
      this.registryInstance = new Contract(
        address,
        SEMAPHORE_VOTE_ABI,
        this.blockchain.getWallet(),
      );
    }
    return this.registryInstance;
  }

  async validateProof(
    groupId: string,
    proof: SemaphoreProofInput,
  ): Promise<ValidateProofResult> {
    const tuple = {
      merkleTreeDepth: proof.merkleTreeDepth,
      merkleTreeRoot: BigInt(proof.merkleTreeRoot),
      nullifier: BigInt(proof.nullifier),
      message: BigInt(proof.message),
      scope: BigInt(proof.scope),
      points: proof.points.map((point) => BigInt(point)),
    };

    try {
      const tx = await this.blockchain.sendSerialized(
        `validateProof(group=${groupId})`,
        () => this.registry.validateProof(BigInt(groupId), tuple),
      );
      const receipt = (await tx.wait()) as TransactionReceipt;
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaccion on-chain revertida (tx=${tx.hash})`);
      }
      return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
      const mapped = this.mapOnChainError(error);
      if (mapped) {
        throw mapped;
      }
      throw error;
    }
  }

  async fetchProofValidatedEvents(
    groupId: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<OnChainVoteEvent[]> {
    const filter = this.registry.filters.ProofValidated(BigInt(groupId));
    const logs = await this.registry.queryFilter(filter, fromBlock, toBlock);

    return logs
      .filter((log): log is EventLog => 'args' in log)
      .map((log) => ({
        nullifier: (log.args.nullifier as bigint).toString(),
        message: (log.args.message as bigint).toString(),
        merkleTreeRoot: (log.args.merkleTreeRoot as bigint).toString(),
        scope: (log.args.scope as bigint).toString(),
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
      }));
  }

  async getCurrentBlockNumber(): Promise<number> {
    return this.blockchain.getProvider().getBlockNumber();
  }

  private mapOnChainError(error: unknown): VoteOnChainError | null {
    const data = this.extractRevertData(error);
    if (!data) {
      return null;
    }
    try {
      const parsed = this.registry.interface.parseError(data);
      if (parsed?.name === 'Semaphore__YouAreUsingTheSameNullifierTwice') {
        return new VoteOnChainError('NULLIFIER_REUSED', 'El nullifier ya fue usado on-chain');
      }
      if (parsed?.name === 'Semaphore__InvalidProof') {
        return new VoteOnChainError('INVALID_PROOF', 'La prueba on-chain no es valida');
      }
    } catch {
      // Revert no decodificable con esta ABI -- se relanza el error original.
    }
    return null;
  }

  private extractRevertData(error: unknown): string | null {
    const carrier = error as RevertDataCarrier;
    return carrier?.data ?? carrier?.info?.error?.data ?? carrier?.error?.data ?? null;
  }
}
