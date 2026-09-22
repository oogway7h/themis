import { ApiProperty } from '@nestjs/swagger';

export class OptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  electionId!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ nullable: true })
  descripcion!: string | null;

  @ApiProperty({ readOnly: true, description: 'Valor usado como `message` de Semaphore al votar' })
  onChainIndex!: number;
}
