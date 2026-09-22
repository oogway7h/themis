import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PresentCredentialDto {
  @ApiProperty({
    description:
      'preparedMessage (base64) tal como lo firmo el backend - el commitment real se extrae de aqui, recortando el prefijo aleatorio de RFC 9474.',
  })
  @IsString()
  @IsNotEmpty()
  preparedMessage!: string;

  @ApiProperty({ description: 'Firma RSA ya descegada (base64), producida por suite.finalize()' })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}
