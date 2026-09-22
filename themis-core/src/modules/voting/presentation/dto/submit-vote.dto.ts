import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, Min } from 'class-validator';

// Shape exacto de SemaphoreProof (ver @semaphore-protocol/proof generateProof())
// tal como lo genera /prove de themis-web dentro del WebView de themis-app.
export class SubmitVoteDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  merkleTreeDepth!: number;

  @ApiProperty()
  @IsString()
  merkleTreeRoot!: string;

  @ApiProperty()
  @IsString()
  nullifier!: string;

  @ApiProperty({ description: 'Opcion elegida, como Option.onChainIndex' })
  @IsString()
  message!: string;

  @ApiProperty({ description: 'election.onChainGroupId' })
  @IsString()
  scope!: string;

  @ApiProperty({ type: [String], description: 'Proof Groth16 empaquetado (8 elementos)' })
  @IsArray()
  @ArrayMinSize(8)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  points!: string[];
}
