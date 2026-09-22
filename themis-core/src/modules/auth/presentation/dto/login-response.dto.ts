import { ApiProperty } from '@nestjs/swagger';
import { PlatformRole } from '../../domain/platform-user.entity';

export class LoginResponseDto {
  @ApiProperty({ enum: ['ADMIN', 'AUTORIDAD_REGISTRO', 'AUDITOR'] })
  role!: PlatformRole;

  @ApiProperty()
  nombreCompleto!: string;
}
