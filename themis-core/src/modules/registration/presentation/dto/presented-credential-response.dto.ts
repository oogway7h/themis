import { ApiProperty } from '@nestjs/swagger';
import { PresentedCredential } from '../../domain/presented-credential.entity';

export class PresentedCredentialResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  static fromDomain(credential: PresentedCredential): PresentedCredentialResponseDto {
    const dto = new PresentedCredentialResponseDto();
    dto.id = credential.id;
    dto.status = credential.status;
    return dto;
  }
}
