import { Inject, Injectable } from '@nestjs/common';
import {
  PING_LOG_REPOSITORY,
  type PingLogRepository,
} from '../domain/ping-log.repository';
import type { PingLog } from '../domain/ping-log.entity';

@Injectable()
export class ListPingsUseCase {
  constructor(
    @Inject(PING_LOG_REPOSITORY)
    private readonly repository: PingLogRepository,
  ) {}

  async execute(limit: number): Promise<{ total: number; items: PingLog[] }> {
    const [total, items] = await Promise.all([
      this.repository.count(),
      this.repository.findLatest(limit),
    ]);

    return { total, items };
  }
}
