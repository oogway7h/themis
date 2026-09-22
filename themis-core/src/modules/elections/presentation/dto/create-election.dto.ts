import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { OptionInputDto } from './option-input.dto';

// La cantidad mínima de opciones (MIN_OPTIONS) es una regla de negocio, no de formato:
// se valida en CreateElectionUseCase (assertMinOptions) para que la respuesta incluya el
// code ELECTION_MIN_OPTIONS, no el 400 genérico de ValidationPipe.

export class CreateElectionDto {
  @ApiProperty({ example: 'Representante FICCT 2026' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty()
  @IsISO8601()
  registroInicio!: string;

  @ApiProperty()
  @IsISO8601()
  registroFin!: string;

  @ApiProperty()
  @IsISO8601()
  votacionInicio!: string;

  @ApiProperty()
  @IsISO8601()
  votacionFin!: string;

  @ApiProperty({ type: [OptionInputDto], minItems: 2 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionInputDto)
  opciones!: OptionInputDto[];
}
