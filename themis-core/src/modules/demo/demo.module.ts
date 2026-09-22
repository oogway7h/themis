import { Module } from '@nestjs/common';
import { DemoController } from './presentation/demo.controller';
import { CreatePingUseCase } from './application/create-ping.usecase';
import { ListPingsUseCase } from './application/list-pings.usecase';
import { GetForecastUseCase } from './application/get-forecast.usecase';
import { PrismaPingLogRepository } from './infrastructure/prisma-ping-log.repository';
import { PING_LOG_REPOSITORY } from './domain/ping-log.repository';

@Module({
  controllers: [DemoController],
  providers: [
    CreatePingUseCase,
    ListPingsUseCase,
    GetForecastUseCase,
    {
      provide: PING_LOG_REPOSITORY,
      useClass: PrismaPingLogRepository,
    },
  ],
})
export class DemoModule {}
