import { ApiProperty } from '@nestjs/swagger';
import type {
  PublicElectionDetail,
  PublicElectionOption,
} from '../../domain/voting.repository';

export class PublicOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ nullable: true })
  descripcion!: string | null;

  @ApiProperty({ nullable: true })
  onChainIndex!: number | null;

  static fromDomain(option: PublicElectionOption): PublicOptionResponseDto {
    const dto = new PublicOptionResponseDto();
    dto.id = option.id;
    dto.nombre = option.nombre;
    dto.descripcion = option.descripcion;
    dto.onChainIndex = option.onChainIndex;
    return dto;
  }
}

export class PublicElectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ nullable: true })
  descripcion!: string | null;

  @ApiProperty()
  estado!: string;

  @ApiProperty()
  votacionInicio!: Date;

  @ApiProperty()
  votacionFin!: Date;

  @ApiProperty({ nullable: true })
  onChainGroupId!: string | null;

  @ApiProperty({ nullable: true })
  merkleRoot!: string | null;

  @ApiProperty({ type: [PublicOptionResponseDto] })
  opciones!: PublicOptionResponseDto[];

  static fromDomain(detail: PublicElectionDetail): PublicElectionResponseDto {
    const dto = new PublicElectionResponseDto();
    dto.id = detail.id;
    dto.nombre = detail.nombre;
    dto.descripcion = detail.descripcion;
    dto.estado = detail.estado;
    dto.votacionInicio = detail.votacionInicio;
    dto.votacionFin = detail.votacionFin;
    dto.onChainGroupId = detail.onChainGroupId;
    dto.merkleRoot = detail.merkleRoot;
    dto.opciones = detail.opciones.map(PublicOptionResponseDto.fromDomain);
    return dto;
  }
}
