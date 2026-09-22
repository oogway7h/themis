import { ApiProperty } from '@nestjs/swagger';

export class RegistrationPublicKeyResponseDto {
  @ApiProperty({
    description: 'Clave publica RSA-PSS (JWK, JSON serializado) usada para cegar el commitment',
  })
  publicKeyJwk!: string;
}
