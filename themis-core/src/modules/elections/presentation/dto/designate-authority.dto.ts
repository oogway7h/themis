import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class DesignateAuthorityDto {
  @ApiProperty()
  @IsUUID()
  platformUserId!: string;

  @ApiProperty({ example: 'Profesor titular' })
  @IsString()
  @IsNotEmpty()
  rolDescriptivo!: string;
}
