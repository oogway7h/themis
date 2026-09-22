import { Inject, Injectable } from '@nestjs/common';
import {
  PING_LOG_REPOSITORY,
  type PingLogRepository,
} from '../domain/ping-log.repository';
import type { PingLog } from '../domain/ping-log.entity';

export interface CreatePingCommand {
  source: string;
  note?: string;
}

@Injectable()
export class CreatePingUseCase {
  constructor(
    @Inject(PING_LOG_REPOSITORY)
    private readonly repository: PingLogRepository,
  ) {}

  execute(command: CreatePingCommand): Promise<PingLog> {
    return this.repository.create({
      source: command.source,
      note: command.note ?? null,
    });
  }
}
