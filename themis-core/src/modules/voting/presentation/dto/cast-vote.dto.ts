import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SemaphoreProofDto {
  @ApiProperty({ description: 'Profundidad del árbol de Merkle', example: 16 })
  @IsNotEmpty()
  merkleTreeDepth!: string | number;

  @ApiProperty({ description: 'Raíz del árbol de Merkle en decimal o hex', example: '182391283912' })
  @IsString()
  @IsNotEmpty()
  merkleTreeRoot!: string;

  @ApiProperty({ description: 'Nullifier único del votante para esta elección', example: '492819238912' })
  @IsString()
  @IsNotEmpty()
  nullifier!: string;

  @ApiProperty({ description: 'Mensaje que representa la opción votada', example: '1' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ description: 'Scope que identifica la elección', example: '1' })
  @IsString()
  @IsNotEmpty()
  scope!: string;

  @ApiProperty({ description: '8 puntos Groth16 de la prueba ZK', example: ['1', '2', '3', '4', '5', '6', '7', '8'] })
  @IsArray()
  @IsString({ each: true })
  points!: string[];
}

export class CastVoteDto {
  @ApiProperty({ description: 'ID de la opción seleccionada', example: 'f87a3cb3-c159-4d69-b599-4d765fe659ba' })
  @IsString()
  @IsNotEmpty()
  optionId!: string;

  @ApiProperty({ description: 'Prueba de Semaphore completa', type: SemaphoreProofDto })
  @ValidateNested()
  @Type(() => SemaphoreProofDto)
  proof!: SemaphoreProofDto;

  @ApiProperty({
    description: 'Assertion Mock SSO para asentar voto en el padrón electoral sin vincular a la opción',
    required: false,
  })
  @IsOptional()
  @IsString()
  assertion?: string;
}
