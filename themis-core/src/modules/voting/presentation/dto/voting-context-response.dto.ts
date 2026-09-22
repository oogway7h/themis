import { ApiProperty } from '@nestjs/swagger';
import { VotingContext } from '../../application/get-voting-context.usecase';

class VotingContextOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  onChainIndex!: number;
}

export class VotingContextResponseDto {
  @ApiProperty()
  electionId!: string;

  @ApiProperty()
  onChainGroupId!: string;

  @ApiProperty({ type: [String], description: 'Commitments del grupo, en orden de insercion on-chain' })
  members!: string[];

  @ApiProperty({ type: [VotingContextOptionDto] })
  options!: VotingContextOptionDto[];

  static fromContext(context: VotingContext): VotingContextResponseDto {
    const dto = new VotingContextResponseDto();
    dto.electionId = context.electionId;
    dto.onChainGroupId = context.onChainGroupId;
    dto.members = context.members;
    dto.options = context.options;
    return dto;
  }
}
