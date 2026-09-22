import { Inject, Injectable } from '@nestjs/common';
import { AiClientService } from '../../../shared/http/ai-client.service';
import {
  PING_LOG_REPOSITORY,
  type PingLogRepository,
} from '../domain/ping-log.repository';
import type { ForecastPoint } from '../../../shared/http/ai-client.service';

export interface ForecastResult {
  source: 'themis-ai' | 'unavailable';
  model: string | null;
  series: ForecastPoint[];
  projection: ForecastPoint[];
  projectedTotal: number | null;
}

@Injectable()
export class GetForecastUseCase {
  constructor(
    @Inject(PING_LOG_REPOSITORY)
    private readonly repository: PingLogRepository,
    private readonly ai: AiClientService,
  ) {}

  async execute(electionId: string, horizon: number): Promise<ForecastResult> {
    const series = await this.buildAggregatedSeries();

    const forecast = await this.ai.forecast({
      electionId,
      horizon,
      series,
    });

    if (!forecast) {
      return {
        source: 'unavailable',
        model: null,
        series,
        projection: [],
        projectedTotal: null,
      };
    }

    return {
      source: 'themis-ai',
      model: forecast.model,
      series,
      projection: forecast.projection,
      projectedTotal: forecast.projectedTotal,
    };
  }

  private async buildAggregatedSeries(): Promise<ForecastPoint[]> {
    const pings = await this.repository.findLatest(200);

    if (pings.length === 0) {
      return [];
    }

    const buckets = new Map<number, number>();
    for (const ping of pings) {
      const minute = Math.floor(ping.createdAt.getTime() / 60_000);
      buckets.set(minute, (buckets.get(minute) ?? 0) + 1);
    }

    const minutes = [...buckets.keys()].sort((a, b) => a - b);
    const base = minutes[0];
    let cumulative = 0;

    return minutes.map((minute) => {
      cumulative += buckets.get(minute) ?? 0;
      return { t: minute - base, votes: cumulative };
    });
  }
}
