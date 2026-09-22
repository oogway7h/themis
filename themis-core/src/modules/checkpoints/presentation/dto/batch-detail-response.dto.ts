import { ApiProperty } from '@nestjs/swagger';
import { BatchDetail } from '../../application/get-batch-detail.usecase';
import { BatchResponseDto } from './batch-response.dto';
import { ApprovalResponseDto } from './approval-response.dto';

export class BatchDetailResponseDto extends BatchResponseDto {
  @ApiProperty({ type: [ApprovalResponseDto] })
  approvals!: ApprovalResponseDto[];

  static fromDetail(detail: BatchDetail): BatchDetailResponseDto {
    const dto = new BatchDetailResponseDto();
    Object.assign(
      dto,
      BatchResponseDto.fromItem({
        batch: detail.batch,
        approvalCount: detail.approvals.length,
        yaAprobado: detail.yaAprobado,
      }),
    );
    dto.approvals = detail.approvals.map((item) => ApprovalResponseDto.fromDomain(item));
    return dto;
  }
}
