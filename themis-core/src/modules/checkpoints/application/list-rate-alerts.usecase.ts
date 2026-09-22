import { Inject, Injectable } from '@nestjs/common';
import { RATE_ALERT_REPOSITORY, RateAlertRepository } from '../domain/rate-alert.repository';
import { RateAlert } from '../domain/rate-alert.entity';

/** Lectura para GET /elections/:id/rate-alerts (ADMIN/AUDITOR). */
@Injectable()
export class ListRateAlertsUseCase {
  constructor(
    @Inject(RATE_ALERT_REPOSITORY)
    private readonly rateAlertRepository: RateAlertRepository,
  ) {}

  execute(electionId: string): Promise<RateAlert[]> {
    return this.rateAlertRepository.findByElection(electionId);
  }
}
