import { ApiProperty } from '@nestjs/swagger';
import { Election } from '../../domain/election.entity';
import { OptionResponseDto } from './option-response.dto';

export class ElectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ nullable: true })
  descripcion!: string | null;

  @ApiProperty()
  registroInicio!: Date;

  @ApiProperty()
  registroFin!: Date;

  @ApiProperty()
  votacionInicio!: Date;

  @ApiProperty()
  votacionFin!: Date;

  @ApiProperty({
    enum: ['BORRADOR', 'REGISTRO_ABIERTO', 'REGISTRO_CERRADO', 'VOTACION_ABIERTA', 'CERRADA'],
  })
  estado!: string;

  @ApiProperty({ enum: ['SEMAPHORE'], readOnly: true })
  mecanismoCriptografico!: string;

  @ApiProperty({ readOnly: true })
  umbralFirmas!: number;

  @ApiProperty({ type: [OptionResponseDto] })
  opciones!: OptionResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  updatedBy!: string;

  static fromDomain(election: Election): ElectionResponseDto {
    const dto = new ElectionResponseDto();
    dto.id = election.id;
    dto.nombre = election.nombre;
    dto.descripcion = election.descripcion;
    dto.registroInicio = election.registroInicio;
    dto.registroFin = election.registroFin;
    dto.votacionInicio = election.votacionInicio;
    dto.votacionFin = election.votacionFin;
    dto.estado = election.estado;
    dto.mecanismoCriptografico = election.mecanismoCriptografico;
    dto.umbralFirmas = election.umbralFirmas;
    dto.opciones = election.opciones.map((option) => ({
      id: option.id,
      electionId: option.electionId,
      nombre: option.nombre,
      descripcion: option.descripcion,
      onChainIndex: option.onChainIndex,
    }));
    dto.createdAt = election.createdAt;
    dto.createdBy = election.createdBy;
    dto.updatedAt = election.updatedAt;
    dto.updatedBy = election.updatedBy;
    return dto;
  }
}
