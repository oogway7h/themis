import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { PlatformRole } from '../../domain/platform-user.entity';

const ROLES: PlatformRole[] = ['ADMIN', 'AUTORIDAD_REGISTRO', 'AUDITOR', 'SUPERUSUARIO'];

export class ListUsersQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({
    description: 'Filtra por email (contains, case-insensitive). Usado por ADMIN para buscar cuentas a designar como autoridad (HU-03).',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ enum: ROLES })
  @IsOptional()
  @IsIn(ROLES)
  role?: PlatformRole;
}
