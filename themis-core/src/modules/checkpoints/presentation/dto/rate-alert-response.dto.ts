import { ApiProperty } from '@nestjs/swagger';
import { RateAlert } from '../../domain/rate-alert.entity';

export class RateAlertResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  windowStart!: Date;

  @ApiProperty()
  windowEnd!: Date;

  @ApiProperty()
  registrationCount!: number;

  @ApiProperty()
  thresholdPerMinute!: number;

  @ApiProperty()
  createdAt!: Date;

  static fromDomain(alert: RateAlert): RateAlertResponseDto {
    const dto = new RateAlertResponseDto();
    dto.id = alert.id;
    dto.windowStart = alert.windowStart;
    dto.windowEnd = alert.windowEnd;
    dto.registrationCount = alert.registrationCount;
    dto.thresholdPerMinute = alert.thresholdPerMinute;
    dto.createdAt = alert.createdAt;
    return dto;
  }
}
