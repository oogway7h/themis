import { ApiProperty } from '@nestjs/swagger';
import { RegistrationBatchStatus } from '../../domain/registration-batch.entity';
import { BatchListItem } from '../../application/list-batches.usecase';

export class BatchResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: RegistrationBatchStatus;

  @ApiProperty()
  credentialCount!: number;

  @ApiProperty()
  approvalsRequired!: number;

  @ApiProperty()
  approvalCount!: number;

  @ApiProperty({ description: 'true si el usuario autenticado ya aprobó este lote' })
  yaAprobado!: boolean;

  @ApiProperty()
  closedAt!: Date;

  @ApiProperty({ required: false, nullable: true })
  insertedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  merkleRootAfter!: string | null;

  @ApiProperty({ required: false, nullable: true })
  onChainTxHash!: string | null;

  @ApiProperty({ required: false, nullable: true })
  failureReason!: string | null;

  static fromItem(item: BatchListItem): BatchResponseDto {
    const dto = new BatchResponseDto();
    dto.id = item.batch.id;
    dto.status = item.batch.status;
    dto.credentialCount = item.batch.credentialCount;
    dto.approvalsRequired = item.batch.approvalsRequired;
    dto.approvalCount = item.approvalCount;
    dto.yaAprobado = item.yaAprobado;
    dto.closedAt = item.batch.closedAt;
    dto.insertedAt = item.batch.insertedAt;
    dto.merkleRootAfter = item.batch.merkleRootAfter;
    dto.onChainTxHash = item.batch.onChainTxHash;
    dto.failureReason = item.batch.failureReason;
    return dto;
  }
}
