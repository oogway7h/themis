import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { OptionInputDto } from './option-input.dto';

export class UpdateElectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  registroInicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  registroFin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  votacionInicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  votacionFin?: string;

  @ApiPropertyOptional({ type: [OptionInputDto], minItems: 2 })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionInputDto)
  opciones?: OptionInputDto[];
}
