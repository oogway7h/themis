import { ApiProperty } from '@nestjs/swagger';
import type { VoteReceiptEntity } from '../../domain/vote-receipt.entity';

export class VoteResponseDto {
  @ApiProperty({ example: 'a9b2c3d4-e5f6-7890-1234-56789abcdef0' })
  id!: string;

  @ApiProperty({ example: 'dc03c565-85c8-452e-88a9-57a231ddff10' })
  electionId!: string;

  @ApiProperty({ example: 'f87a3cb3-c159-4d69-b599-4d765fe659ba' })
  optionId!: string;

  @ApiProperty({ example: '492819238912' })
  nullifier!: string;

  @ApiProperty({
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  txHash!: string;

  @ApiProperty({ example: '2026-09-20T12:00:00.000Z' })
  createdAt!: Date;

  static fromDomain(receipt: VoteReceiptEntity): VoteResponseDto {
    const dto = new VoteResponseDto();
    dto.id = receipt.id;
    dto.electionId = receipt.electionId;
    dto.optionId = receipt.optionId;
    dto.nullifier = receipt.nullifier;
    dto.txHash = receipt.txHash;
    dto.createdAt = receipt.createdAt;
    return dto;
  }
}
