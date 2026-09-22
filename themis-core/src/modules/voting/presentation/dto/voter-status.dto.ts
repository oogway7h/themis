import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckVoterStatusDto {
  @ApiProperty({
    description: 'Assertion JWT de Mock SSO para verificar elegibilidad y participación',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  assertion!: string;
}

export class VoterStatusResponseDto {
  @ApiProperty({ description: 'ID de la elección' })
  electionId!: string;

  @ApiProperty({ description: 'Si el elector se encuentra registrado en el padrón para esta elección' })
  isRegistered!: boolean;

  @ApiProperty({ description: 'Si el elector ya emitió su voto en esta elección' })
  hasVoted!: boolean;

  @ApiProperty({ description: 'Fecha y hora en que el elector emitió su voto, si aplica', nullable: true })
  votedAt!: string | null;
}
