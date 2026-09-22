import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  InsertBatchResult,
  SemaphoreOnChainPort,
} from '../domain/semaphore-onchain.port';

/**
 * Stub temporal: NO llama a ninguna blockchain. Devuelve un resultado
 * sintetico para poder validar toda la maquina de estados de
 * ApproveBatchUseCase (CU-08) antes de que exista ThemisSemaphoreRegistry.sol
 * (CU-09). Reemplazar por la implementacion real en shared/blockchain una
 * vez el contrato este desplegado -- ver plan, fase 4/5.
 */
@Injectable()
export class StubSemaphoreOnChainService implements SemaphoreOnChainPort {
  private readonly logger = new Logger(StubSemaphoreOnChainService.name);

  async insertBatch(electionId: string, commitments: string[]): Promise<InsertBatchResult> {
    this.logger.warn(
      `StubSemaphoreOnChainService: insercion simulada para election=${electionId}, ` +
        `${commitments.length} commitments. Reemplazar por la integracion real (CU-09).`,
    );
    return {
      txHash: `0xstub-${randomUUID()}`,
      newRoot: `stub-root-${randomUUID()}`,
      groupId: `stub-group-${electionId}`,
    };
  }
}
