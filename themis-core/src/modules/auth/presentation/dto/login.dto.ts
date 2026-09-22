import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@themis.dev' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
