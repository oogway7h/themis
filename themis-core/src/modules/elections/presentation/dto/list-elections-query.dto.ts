import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ElectionStatus } from '../../domain/election.entity';

const ESTADOS: ElectionStatus[] = [
  'BORRADOR',
  'REGISTRO_ABIERTO',
  'REGISTRO_CERRADO',
  'VOTACION_ABIERTA',
  'CERRADA',
];

export class ListElectionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ enum: ESTADOS })
  @IsOptional()
  @IsIn(ESTADOS)
  estado?: ElectionStatus;
}
