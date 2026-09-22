import { ApiProperty } from '@nestjs/swagger';
import type { MerkleTreeDetail } from '../../application/get-merkle-tree.usecase';

export class MerkleTreeResponseDto {
  @ApiProperty()
  electionId!: string;

  @ApiProperty({ nullable: true })
  onChainGroupId!: string | null;

  @ApiProperty({ nullable: true })
  merkleRoot!: string | null;

  @ApiProperty({ type: [String] })
  members!: string[];

  @ApiProperty()
  depth!: number;

  static fromDomain(detail: MerkleTreeDetail): MerkleTreeResponseDto {
    const dto = new MerkleTreeResponseDto();
    dto.electionId = detail.electionId;
    dto.onChainGroupId = detail.onChainGroupId;
    dto.merkleRoot = detail.merkleRoot;
    dto.members = detail.members;
    dto.depth = detail.depth;
    return dto;
  }
}
