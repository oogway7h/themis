import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { AUTHORITY_QUOTA } from '../../domain/election.constants';
import { DesignateAuthorityDto } from './designate-authority.dto';

// El cupo exacto de AUTHORITY_QUOTA (5) es una regla de negocio: se valida en
// DesignateAuthoritiesUseCase (assertExactQuota) para que la respuesta incluya el code
// AUTHORITY_QUOTA_INVALID, no el 400 genérico de ValidationPipe.
export class DesignateAuthoritiesDto {
  @ApiProperty({ type: [DesignateAuthorityDto], minItems: AUTHORITY_QUOTA, maxItems: AUTHORITY_QUOTA })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignateAuthorityDto)
  autoridades!: DesignateAuthorityDto[];
}
