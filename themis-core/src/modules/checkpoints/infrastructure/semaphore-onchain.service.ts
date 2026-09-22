import { Inject, Injectable, Logger } from '@nestjs/common';
import { Contract, type TransactionReceipt } from 'ethers';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import { BlockchainService } from '../../../shared/blockchain/blockchain.service';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
} from '../../elections/domain/election.repository';
import { Election } from '../../elections/domain/election.entity';
import type {
  InsertBatchResult,
  SemaphoreOnChainPort,
} from '../domain/semaphore-onchain.port';

/**
 * Subconjunto de la ABI de Semaphore (@semaphore-protocol/contracts) que
 * ThemisSemaphoreRegistry despliega tal cual -- solo lo que este servicio usa,
 * mismo patron que THEMIS_REGISTRY_ABI en shared/blockchain.
 */
const SEMAPHORE_REGISTRY_ABI = [
  'function createGroup(address admin, uint256 merkleTreeDuration) returns (uint256 groupId)',
  'function addMembers(uint256 groupId, uint256[] identityCommitments)',
  'function getMerkleTreeRoot(uint256 groupId) view returns (uint256)',
  'function hasMember(uint256 groupId, uint256 identityCommitment) view returns (bool)',
  'event GroupCreated(uint256 indexed groupId)',
];

// Cuanto tiempo sigue siendo valida una raiz anterior para verificar pruebas. Con 0, una
// prueba hecha contra una raiz que ya no es la vigente falla en cuanto se inserta otro lote.
// 1 hora es el valor por defecto de Semaphore. Solo aplica a grupos nuevos.
const MERKLE_TREE_DURATION_SECONDS = 3600n;

/**
 * Implementacion real de SemaphoreOnChainPort (CU-09): un grupo Semaphore por
 * eleccion, creado de forma perezosa en la primera insercion, con la wallet
 * relayer como admin (unica cuenta que llama addMembers -- el multisig 3-de-5
 * ya ocurrio off-chain en ApproveBatchUseCase antes de llegar aqui).
 */
@Injectable()
export class SemaphoreOnChainService implements SemaphoreOnChainPort {
  private readonly logger = new Logger(SemaphoreOnChainService.name);
  private registryInstance: Contract | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly blockchain: BlockchainService,
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
  ) {}

  // Perezoso: un .env sin SEMAPHORE_REGISTRY_ADDRESS no debe impedir que el
  // backend arranque, solo que falle la insercion on-chain (queda como
  // INSERTION_FAILED con un mensaje claro y el cron de reintento la retoma).
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
        SEMAPHORE_REGISTRY_ABI,
        this.blockchain.getWallet(),
      );
    }
    return this.registryInstance;
  }

  /**
   * `createGroup` y `addMembers` van en la MISMA seccion critica: son dos
   * transacciones consecutivas de la misma cuenta relayer, y si otro envio se
   * cuela entre ellas el nonce de la segunda ya no sirve.
   */
  async insertBatch(electionId: string, commitments: string[]): Promise<InsertBatchResult> {
    return this.blockchain.sendSerialized(
      `insertBatch(election=${electionId}, n=${commitments.length})`,
      () => this.insertBatchUnsafe(electionId, commitments),
    );
  }

  private async insertBatchUnsafe(
    electionId: string,
    commitments: string[],
  ): Promise<InsertBatchResult> {
    const election = await this.electionRepository.findById(electionId);
    if (!election) {
      throw new Error(`Eleccion ${electionId} no encontrada al insertar on-chain`);
    }

    const groupId = await this.ensureGroup(election);
    const bigintCommitments = commitments.map((commitment) => BigInt(commitment));

    if (await this.isFullyInserted(groupId, bigintCommitments)) {
      this.logger.warn(
        `Lote ya insertado on-chain previamente para election=${electionId}, grupo=${groupId} ` +
          '(reintento seguro, no se reenvia la transaccion)',
      );
      const currentRoot = (await this.registry.getMerkleTreeRoot(groupId)) as bigint;
      return {
        txHash: 'ya-insertado-previamente',
        newRoot: currentRoot.toString(),
        groupId: groupId.toString(),
      };
    }

    await this.assertNoPartialOverlap(groupId, bigintCommitments);

    const tx = await this.registry.addMembers(groupId, bigintCommitments);
    const receipt = (await tx.wait()) as TransactionReceipt;
    if (!receipt || receipt.status !== 1) {
      throw new Error(`Transaccion on-chain revertida (tx=${tx.hash})`);
    }

    const newRoot = (await this.registry.getMerkleTreeRoot(groupId)) as bigint;

    return {
      txHash: receipt.hash,
      newRoot: newRoot.toString(),
      groupId: groupId.toString(),
    };
  }

  private async ensureGroup(election: Election): Promise<bigint> {
    if (election.onChainGroupId !== null) {
      return BigInt(election.onChainGroupId);
    }

    if (election.profundidadArbol === null) {
      throw new Error(
        `Eleccion ${election.id} no tiene profundidadArbol configurado; ` +
          'no se puede crear el grupo Semaphore',
      );
    }

    this.logger.log(
      `Creando grupo Semaphore para eleccion ${election.id} ` +
        `(capacidad max. ${election.capacidadMaxima})`,
    );

    const tx = await this.registry.createGroup(
      this.blockchain.getWallet().address,
      MERKLE_TREE_DURATION_SECONDS,
    );
    const receipt = (await tx.wait()) as TransactionReceipt;
    const groupId = this.extractGroupIdFromReceipt(receipt);

    await this.electionRepository.setOnChainGroup(election.id, groupId.toString());

    return groupId;
  }

  private extractGroupIdFromReceipt(receipt: TransactionReceipt): bigint {
    for (const log of receipt.logs) {
      try {
        const parsed = this.registry.interface.parseLog(log);
        if (parsed?.name === 'GroupCreated') {
          return parsed.args.groupId as bigint;
        }
      } catch {
        // log de otro contrato/evento, se ignora
      }
    }
    throw new Error('No se encontro el evento GroupCreated en el recibo de creacion de grupo');
  }

  /**
   * Guarda de reintento: si RetryPendingInsertionsUseCase vuelve a llamar
   * insertBatch para un lote que ya se inserto on-chain pero fallo al
   * persistir en la BD, no reenvia la transaccion (revertiria o duplicaria).
   */
  private async isFullyInserted(groupId: bigint, commitments: bigint[]): Promise<boolean> {
    if (commitments.length === 0) {
      return false;
    }
    const membership = await Promise.all(
      commitments.map((commitment) => this.registry.hasMember(groupId, commitment) as Promise<boolean>),
    );
    return membership.every(Boolean);
  }

  private async assertNoPartialOverlap(groupId: bigint, commitments: bigint[]): Promise<void> {
    const membership = await Promise.all(
      commitments.map((commitment) => this.registry.hasMember(groupId, commitment) as Promise<boolean>),
    );
    if (membership.some(Boolean)) {
      throw new Error(
        `Insercion parcial detectada para el grupo ${groupId}: algunos commitments de este ` +
          'lote ya estan on-chain y otros no. Revisar manualmente antes de reintentar.',
      );
    }
  }
}
