import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdvanceElectionLifecycleUseCase } from '../application/advance-election-lifecycle.usecase';

@Injectable()
export class ElectionLifecycleScheduler {
  private readonly logger = new Logger(ElectionLifecycleScheduler.name);

  constructor(private readonly advanceElectionLifecycle: AdvanceElectionLifecycleUseCase) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleLifecycleTick(): Promise<void> {
    try {
      await this.advanceElectionLifecycle.execute();
    } catch (error) {
      this.logger.error(`Fallo el tick de ciclo de vida de elecciones: ${(error as Error).message}`);
    }
  }
}
