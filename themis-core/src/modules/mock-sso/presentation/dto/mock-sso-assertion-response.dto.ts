import { ApiProperty } from '@nestjs/swagger';

export class MockSsoAssertionResponseDto {
  @ApiProperty({
    description: 'Assertion firmada: base64url(payload) + "." + hmacSha256Hex',
  })
  assertion!: string;
}
