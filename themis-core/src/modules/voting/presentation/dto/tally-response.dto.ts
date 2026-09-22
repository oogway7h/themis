import { ApiProperty } from '@nestjs/swagger';
import { Tally } from '../../application/get-live-tally.usecase';

class TallyOptionDto {
  @ApiProperty()
  optionId!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  voteCount!: number;
}

export class TallyResponseDto {
  @ApiProperty()
  electionId!: string;

  @ApiProperty()
  estado!: string;

  @ApiProperty()
  totalVotes!: number;

  @ApiProperty({ type: [TallyOptionDto] })
  opciones!: TallyOptionDto[];

  @ApiProperty()
  asOf!: Date;

  static fromTally(tally: Tally): TallyResponseDto {
    const dto = new TallyResponseDto();
    dto.electionId = tally.electionId;
    dto.estado = tally.estado;
    dto.totalVotes = tally.totalVotes;
    dto.opciones = tally.opciones;
    dto.asOf = tally.asOf;
    return dto;
  }
}
