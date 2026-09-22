import { ApiProperty } from '@nestjs/swagger';
import { AuthorityWithEmail } from '../../application/list-authorities.usecase';

export class AuthorityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  rolDescriptivo!: string;

  @ApiProperty({ description: 'Solo visible para ADMIN, ver decisiones de diseño de HU-03' })
  platformUserEmail!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromDomain(authority: AuthorityWithEmail): AuthorityResponseDto {
    const dto = new AuthorityResponseDto();
    dto.id = authority.id;
    dto.rolDescriptivo = authority.rolDescriptivo;
    dto.platformUserEmail = authority.platformUserEmail;
    dto.createdAt = authority.createdAt;
    dto.updatedAt = authority.updatedAt;
    return dto;
  }
}
