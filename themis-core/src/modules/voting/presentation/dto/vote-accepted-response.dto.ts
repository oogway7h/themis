import { ApiProperty } from '@nestjs/swagger';
import { SubmitVoteResult } from '../../application/submit-vote.usecase';

export class VoteAcceptedResponseDto {
  @ApiProperty({ default: true })
  accepted!: boolean;

  @ApiProperty()
  onChainTxHash!: string;

  static fromResult(result: SubmitVoteResult): VoteAcceptedResponseDto {
    const dto = new VoteAcceptedResponseDto();
    dto.accepted = true;
    dto.onChainTxHash = result.onChainTxHash;
    return dto;
  }
}
