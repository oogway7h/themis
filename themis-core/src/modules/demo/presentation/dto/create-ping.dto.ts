import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePingDto {
  @ApiProperty({ example: 'themis-web' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  source!: string;

  @ApiPropertyOptional({ example: 'prueba de conectividad' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}
