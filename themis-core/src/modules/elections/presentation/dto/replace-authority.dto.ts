import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReplaceAuthorityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  platformUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  rolDescriptivo?: string;
}
