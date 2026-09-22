import { PingLog } from './ping-log.entity';

export interface CreatePingLogInput {
  source: string;
  note: string | null;
}

export interface PingLogRepository {
  create(input: CreatePingLogInput): Promise<PingLog>;
  findLatest(limit: number): Promise<PingLog[]>;
  count(): Promise<number>;
}

export const PING_LOG_REPOSITORY = 'PING_LOG_REPOSITORY';
