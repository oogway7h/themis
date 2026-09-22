import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import {
  MIN_CHECKPOINT_INTERVAL_MINUTES,
  MAX_CHECKPOINT_INTERVAL_MINUTES,
  MIN_RATE_LIMIT_THRESHOLD,
  MAX_RATE_LIMIT_THRESHOLD,
} from '../../domain/election.constants';

// Los rangos son reglas de negocio: se validan en ConfigureCheckpointPolicyUseCase
// (assertCheckpointIntervalInRange / assertRateLimitThresholdInRange) para que la respuesta
// incluya el code específico (CHECKPOINT_INTERVAL_OUT_OF_RANGE /
// RATE_LIMIT_THRESHOLD_OUT_OF_RANGE), no el 400 genérico de ValidationPipe.
export class ConfigureCheckpointPolicyDto {
  @ApiProperty({
    minimum: MIN_CHECKPOINT_INTERVAL_MINUTES,
    maximum: MAX_CHECKPOINT_INTERVAL_MINUTES,
    example: 60,
  })
  @IsInt()
  checkpointIntervalMinutes!: number;

  @ApiProperty({
    minimum: MIN_RATE_LIMIT_THRESHOLD,
    maximum: MAX_RATE_LIMIT_THRESHOLD,
    example: 50,
  })
  @IsInt()
  rateLimitThresholdPerMinute!: number;
}
