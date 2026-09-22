import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CloseDueCheckpointsUseCase } from '../application/close-due-checkpoints.usecase';
import { CheckRegistrationRateUseCase } from '../application/check-registration-rate.usecase';
import { RetryPendingInsertionsUseCase } from '../application/retry-pending-insertions.usecase';

/**
 * Cron entrypoint de CU-06/CU-07/CU-09. Tick de 1 minuto para el cierre de
 * checkpoint y el monitoreo de ritmo, que iguala al checkpointIntervalMinutes
 * minimo configurable (1 min). El tick no esta alineado en fase con el `dueAt`
 * de cada eleccion, asi que con el intervalo minimo el cierre efectivo cae
 * entre 1 y 2 minutos: nunca antes de lo configurado, que es lo que importa.
 * El reintento de inserciones es una red de seguridad, con tick mas espaciado
 * -- ver ApproveBatchUseCase (disparador primario, sincrono) y
 * RetryPendingInsertionsUseCase.
 */
@Injectable()
export class CheckpointScheduler {
  private readonly logger = new Logger(CheckpointScheduler.name);

  constructor(
    private readonly closeDueCheckpoints: CloseDueCheckpointsUseCase,
    private readonly checkRegistrationRate: CheckRegistrationRateUseCase,
    private readonly retryPendingInsertions: RetryPendingInsertionsUseCase,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCheckpointClose(): Promise<void> {
    try {
      await this.closeDueCheckpoints.execute();
    } catch (error) {
      this.logger.error(`Fallo el tick de cierre de checkpoint: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleRateCheck(): Promise<void> {
    try {
      await this.checkRegistrationRate.execute();
    } catch (error) {
      this.logger.error(`Fallo el tick de monitoreo de ritmo: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRetryInsertions(): Promise<void> {
    try {
      await this.retryPendingInsertions.execute();
    } catch (error) {
      this.logger.error(`Fallo el tick de reintento de inserciones: ${(error as Error).message}`);
    }
  }
}
