import { ApiProperty } from '@nestjs/swagger';
import { AuditResult } from '../../application/get-audit-result.usecase';

class AuditFinalResultDto {
  @ApiProperty()
  totalVotes!: number;

  @ApiProperty()
  finalMerkleRoot!: string;

  @ApiProperty()
  sourceBlockNumber!: number;

  @ApiProperty()
  computedAt!: Date;
}

class AuditChainSyncDto {
  @ApiProperty()
  lastSyncedBlock!: number;

  @ApiProperty()
  updatedAt!: Date;
}

class AuditTallyOptionDto {
  @ApiProperty()
  optionId!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  voteCount!: number;
}

class VoteSubmissionCountsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  relay!: number;

  @ApiProperty()
  chainSync!: number;
}

export class AuditResultResponseDto {
  @ApiProperty()
  electionId!: string;

  @ApiProperty()
  estado!: string;

  @ApiProperty({ type: AuditFinalResultDto, nullable: true })
  result!: AuditFinalResultDto | null;

  @ApiProperty({ type: [AuditTallyOptionDto] })
  liveTally!: AuditTallyOptionDto[];

  @ApiProperty({ type: AuditChainSyncDto, nullable: true })
  chainSync!: AuditChainSyncDto | null;

  @ApiProperty({ type: VoteSubmissionCountsDto })
  voteSubmissionCounts!: VoteSubmissionCountsDto;

  static fromResult(result: AuditResult): AuditResultResponseDto {
    const dto = new AuditResultResponseDto();
    dto.electionId = result.electionId;
    dto.estado = result.estado;
    dto.result = result.result;
    dto.liveTally = result.liveTally;
    dto.chainSync = result.chainSync;
    dto.voteSubmissionCounts = result.voteSubmissionCounts;
    return dto;
  }
}
