import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginMockSsoDto {
  @ApiProperty({ example: '2020123456' })
  @IsString()
  @IsNotEmpty()
  codigoInstitucional!: string;

  @ApiProperty({ example: 'votante-habilitado-2026' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
