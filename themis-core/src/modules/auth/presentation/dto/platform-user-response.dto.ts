import { ApiProperty } from '@nestjs/swagger';
import type { CreatablePlatformRole } from './create-user.dto';

/**
 * Forma de respuesta compartida por create/update/list de cuentas de
 * plataforma. Nunca incluye passwordHash.
 */
export class PlatformUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  nombreCompleto!: string;

  @ApiProperty({ enum: ['ADMIN', 'AUTORIDAD_REGISTRO', 'AUDITOR'] })
  role!: CreatablePlatformRole;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
