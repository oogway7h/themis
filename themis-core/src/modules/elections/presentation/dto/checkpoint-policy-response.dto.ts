import { ApiProperty } from '@nestjs/swagger';
import { EffectivePolicy } from '../../application/get-effective-policy.usecase';

export class CheckpointPolicyResponseDto {
  @ApiProperty()
  checkpointIntervalMinutes!: number;

  @ApiProperty()
  rateLimitThresholdPerMinute!: number;

  @ApiProperty()
  esValorPorDefecto!: boolean;

  static fromEffectivePolicy(policy: EffectivePolicy): CheckpointPolicyResponseDto {
    const dto = new CheckpointPolicyResponseDto();
    dto.checkpointIntervalMinutes = policy.checkpointIntervalMinutes;
    dto.rateLimitThresholdPerMinute = policy.rateLimitThresholdPerMinute;
    dto.esValorPorDefecto = policy.esValorPorDefecto;
    return dto;
  }
}
