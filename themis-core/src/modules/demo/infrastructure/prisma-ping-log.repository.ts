import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PingLog } from '../domain/ping-log.entity';
import type {
  CreatePingLogInput,
  PingLogRepository,
} from '../domain/ping-log.repository';

@Injectable()
export class PrismaPingLogRepository implements PingLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePingLogInput): Promise<PingLog> {
    const row = await this.prisma.pingLog.create({
      data: { source: input.source, note: input.note },
    });

    return this.toEntity(row);
  }

  async findLatest(limit: number): Promise<PingLog[]> {
    const rows = await this.prisma.pingLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((row) => this.toEntity(row));
  }

  count(): Promise<number> {
    return this.prisma.pingLog.count();
  }

  private toEntity(row: {
    id: string;
    source: string;
    note: string | null;
    createdAt: Date;
  }): PingLog {
    return new PingLog(row.id, row.source, row.note, row.createdAt);
  }
}
