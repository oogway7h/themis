import { ApiProperty } from '@nestjs/swagger';
import { PlatformUserResponseDto } from './platform-user-response.dto';

export class ListUsersResponseDto {
  @ApiProperty({ type: [PlatformUserResponseDto] })
  data!: PlatformUserResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
