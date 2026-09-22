import { ApiProperty } from '@nestjs/swagger';
import { Election } from '../../domain/election.entity';

// Version reducida de ElectionResponseDto para consumo publico (CU-10 app,
// CU-11 conteo en vivo, CU-15 auditor): sin metadata de auditoria
// (createdBy/updatedBy) ni de elegibilidad SSO.
class PublicOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ nullable: true })
  descripcion!: string | null;
}

export class PublicElectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ nullable: true })
  descripcion!: string | null;

  @ApiProperty()
  votacionInicio!: Date;

  @ApiProperty()
  votacionFin!: Date;

  @ApiProperty({
    enum: ['BORRADOR', 'REGISTRO_ABIERTO', 'REGISTRO_CERRADO', 'VOTACION_ABIERTA', 'CERRADA'],
  })
  estado!: string;

  @ApiProperty({ type: [PublicOptionDto] })
  opciones!: PublicOptionDto[];

  static fromDomain(election: Election): PublicElectionResponseDto {
    const dto = new PublicElectionResponseDto();
    dto.id = election.id;
    dto.nombre = election.nombre;
    dto.descripcion = election.descripcion;
    dto.votacionInicio = election.votacionInicio;
    dto.votacionFin = election.votacionFin;
    dto.estado = election.estado;
    dto.opciones = election.opciones.map((option) => ({
      id: option.id,
      nombre: option.nombre,
      descripcion: option.descripcion,
    }));
    return dto;
  }
}
