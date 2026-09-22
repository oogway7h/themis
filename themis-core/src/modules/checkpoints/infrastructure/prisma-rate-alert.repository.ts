import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RateAlert } from '../domain/rate-alert.entity';
import type {
  CreateRateAlertInput,
  RateAlertRepository,
} from '../domain/rate-alert.repository';
import { rateAlertToDomain } from './rate-alert.mapper';

@Injectable()
export class PrismaRateAlertRepository implements RateAlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRateAlertInput): Promise<RateAlert> {
    const row = await this.prisma.rateAlert.create({
      data: {
        electionId: input.electionId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        registrationCount: input.registrationCount,
        thresholdPerMinute: input.thresholdPerMinute,
      },
    });
    return rateAlertToDomain(row);
  }

  async findByElection(electionId: string, limit = 50): Promise<RateAlert[]> {
    const rows = await this.prisma.rateAlert.findMany({
      where: { electionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(rateAlertToDomain);
  }

  async findLatestByElection(electionId: string): Promise<RateAlert | null> {
    const row = await this.prisma.rateAlert.findFirst({
      where: { electionId },
      orderBy: { createdAt: 'desc' },
    });
    return row ? rateAlertToDomain(row) : null;
  }
}
