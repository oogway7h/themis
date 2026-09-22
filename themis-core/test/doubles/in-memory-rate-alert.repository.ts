import { RateAlert } from '../../src/modules/checkpoints/domain/rate-alert.entity';
import type {
  CreateRateAlertInput,
  RateAlertRepository,
} from '../../src/modules/checkpoints/domain/rate-alert.repository';

export class InMemoryRateAlertRepository implements RateAlertRepository {
  private readonly alerts: RateAlert[] = [];
  private sequence = 0;

  async create(input: CreateRateAlertInput): Promise<RateAlert> {
    this.sequence += 1;
    const alert = new RateAlert(
      `rate-alert-${this.sequence}`,
      input.electionId,
      input.windowStart,
      input.windowEnd,
      input.registrationCount,
      input.thresholdPerMinute,
      'WARNING',
      new Date(),
    );
    this.alerts.push(alert);
    return alert;
  }

  async findByElection(electionId: string, limit = 50): Promise<RateAlert[]> {
    return this.alerts
      .filter((alert) => alert.electionId === electionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async findLatestByElection(electionId: string): Promise<RateAlert | null> {
    const [latest] = await this.findByElection(electionId, 1);
    return latest ?? null;
  }
}
