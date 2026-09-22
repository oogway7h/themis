import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitRegistrationRequestDto {
  @ApiProperty({ description: 'Assertion emitida por POST /mock-sso/login' })
  @IsString()
  @IsNotEmpty()
  assertion!: string;

  @ApiProperty({
    description:
      'Mensaje cegado (RSA blind signature, RFC 9474) derivado del identity commitment de Semaphore. Base64 de blindedMsg tal como lo produce suite.blind() del lado cliente. El backend nunca ve el commitment real.',
  })
  @IsString()
  @IsNotEmpty()
  blindedMessage!: string;
}
