import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
} from '../../elections/domain/election.repository';
import {
  PRESENTED_CREDENTIAL_REPOSITORY,
  PresentedCredentialRepository,
} from '../../registration/domain/presented-credential.repository';
import { RATE_ALERT_REPOSITORY, RateAlertRepository } from '../domain/rate-alert.repository';
import {
  RATE_ALERT_COOLDOWN_MINUTES,
  RATE_CHECK_WINDOW_MINUTES,
} from '../domain/checkpoint.constants';

/**
 * CU-06: por cada eleccion con registro abierto, cuenta cuantas credenciales
 * se presentaron en el ultimo minuto y compara contra
 * rateLimitThresholdEfectivo. Puramente informativo (crea RateAlert), no
 * bloquea ningun flujo de registro. Cooldown para no saturar de alertas
 * mientras dura un aluvion sostenido.
 */
@Injectable()
export class CheckRegistrationRateUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(PRESENTED_CREDENTIAL_REPOSITORY)
    private readonly presentedCredentialRepository: PresentedCredentialRepository,
    @Inject(RATE_ALERT_REPOSITORY)
    private readonly rateAlertRepository: RateAlertRepository,
  ) {}

  async execute(): Promise<void> {
    const elections = await this.electionRepository.findMany({ estado: 'REGISTRO_ABIERTO' });
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - RATE_CHECK_WINDOW_MINUTES * 60_000);

    for (const election of elections) {
      const count = await this.presentedCredentialRepository.countPresentedBetween(
        election.id,
        windowStart,
        windowEnd,
      );
      const threshold = election.rateLimitThresholdEfectivo;
      if (count <= threshold) {
        continue;
      }

      const latest = await this.rateAlertRepository.findLatestByElection(election.id);
      const cooldownActive =
        latest !== null &&
        windowEnd.getTime() - latest.createdAt.getTime() < RATE_ALERT_COOLDOWN_MINUTES * 60_000;
      if (cooldownActive) {
        continue;
      }

      await this.rateAlertRepository.create({
        electionId: election.id,
        windowStart,
        windowEnd,
        registrationCount: count,
        thresholdPerMinute: threshold,
      });
    }
  }
}
