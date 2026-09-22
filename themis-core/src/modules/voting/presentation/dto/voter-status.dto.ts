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

// Sin `hasVoted`/`votedAt`: informarlos exigia guardar quien voto y cuando,
// y esa marca de tiempo permitia asociar al votante con su opcion. El cliente
// sabe si ya voto por el recibo que guarda en el dispositivo.
export class VoterStatusResponseDto {
  @ApiProperty({ description: 'ID de la elección' })
  electionId!: string;

  @ApiProperty({ description: 'Si el elector se encuentra registrado en el padrón para esta elección' })
  isRegistered!: boolean;
}
