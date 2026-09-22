import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export type CreatablePlatformRole = 'ADMIN' | 'AUTORIDAD_REGISTRO' | 'AUDITOR';

const CREATABLE_ROLES: CreatablePlatformRole[] = [
  'ADMIN',
  'AUTORIDAD_REGISTRO',
  'AUDITOR',
];

export class CreateUserDto {
  @ApiProperty({ example: 'nueva.autoridad@themis.dev' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'unaClaveSegura123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Nueva Autoridad de Registro' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombreCompleto!: string;

  @ApiProperty({ enum: CREATABLE_ROLES })
  @IsIn(CREATABLE_ROLES)
  role!: CreatablePlatformRole;
}
