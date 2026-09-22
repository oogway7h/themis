import { ApiProperty } from '@nestjs/swagger';
import { ApprovalWithAuthority } from '../../application/get-batch-detail.usecase';

export class ApprovalResponseDto {
  @ApiProperty()
  authorityId!: string;

  @ApiProperty({ description: 'Rol descriptivo de la autoridad, nunca su identidad real' })
  rolDescriptivo!: string;

  @ApiProperty()
  approvedAt!: Date;

  static fromDomain(item: ApprovalWithAuthority): ApprovalResponseDto {
    const dto = new ApprovalResponseDto();
    dto.authorityId = item.approval.authorityId;
    dto.rolDescriptivo = item.authority?.rolDescriptivo ?? 'Autoridad';
    dto.approvedAt = item.approval.approvedAt;
    return dto;
  }
}
