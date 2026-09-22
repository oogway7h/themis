import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SyncVoteEventsUseCase } from '../application/sync-vote-events.usecase';
import { ExecuteFinalCountUseCase } from '../application/execute-final-count.usecase';

/**
 * Cron entrypoint de CU-10 (red de seguridad)/CU-14. Un solo tick de 1
 * minuto que corre sync antes que el conteo final, en secuencia, para que
 * una eleccion recien cerrada ya vea sus ultimos votos on-chain antes de
 * snapshotear el resultado.
 */
@Injectable()
export class VotingScheduler {
  private readonly logger = new Logger(VotingScheduler.name);

  constructor(
    private readonly syncVoteEvents: SyncVoteEventsUseCase,
    private readonly executeFinalCount: ExecuteFinalCountUseCase,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleTick(): Promise<void> {
    try {
      await this.syncVoteEvents.execute();
    } catch (error) {
      this.logger.error(`Fallo el tick de sincronizacion de votos: ${(error as Error).message}`);
    }

    try {
      await this.executeFinalCount.execute();
    } catch (error) {
      this.logger.error(`Fallo el tick de conteo final: ${(error as Error).message}`);
    }
  }
}
