import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { CreatablePlatformRole } from './create-user.dto';

const CREATABLE_ROLES: CreatablePlatformRole[] = [
  'ADMIN',
  'AUTORIDAD_REGISTRO',
  'AUDITOR',
];

/**
 * Igual que CreateUserDto pero sin email/password -- editar no reabre la
 * unicidad de email ni permite resetear la contrasena por esta ruta.
 */
export class UpdateUserDto {
  @ApiProperty({ example: 'Nueva Autoridad de Registro' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombreCompleto!: string;

  @ApiProperty({ enum: CREATABLE_ROLES })
  @IsIn(CREATABLE_ROLES)
  role!: CreatablePlatformRole;
}
