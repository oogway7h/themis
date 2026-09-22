import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG } from '../../config/configuration';
import type { AppConfig } from '../../config/configuration';

export interface ForecastPoint {
  t: number;
  votes: number;
}

export interface ForecastRequest {
  electionId: string;
  horizon: number;
  series: ForecastPoint[];
}

export interface ForecastResponse {
  electionId: string;
  model: string;
  projection: ForecastPoint[];
  projectedTotal: number;
}

export interface AiStatus {
  reachable: boolean;
  error: string | null;
}

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async getStatus(): Promise<AiStatus> {
    try {
      const response = await this.request('/health', 'GET');
      return { reachable: response.ok, error: response.ok ? null : `HTTP ${response.status}` };
    } catch (error) {
      return { reachable: false, error: (error as Error).message };
    }
  }

  async forecast(payload: ForecastRequest): Promise<ForecastResponse | null> {
    try {
      const response = await this.request('/api/v1/forecast', 'POST', payload);

      if (!response.ok) {
        this.logger.warn(`themis-ai respondio HTTP ${response.status}`);
        return null;
      }

      return (await response.json()) as ForecastResponse;
    } catch (error) {
      this.logger.warn(`themis-ai inalcanzable: ${(error as Error).message}`);
      return null;
    }
  }

  private async request(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.ai.timeoutMs,
    );

    try {
      return await fetch(`${this.config.ai.baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-service-token': this.config.ai.token,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
