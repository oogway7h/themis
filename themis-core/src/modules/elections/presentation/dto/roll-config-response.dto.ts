import { ApiProperty } from '@nestjs/swagger';
import { Election } from '../../domain/election.entity';

export class RollConfigResponseDto {
  @ApiProperty({ nullable: true })
  profundidadArbol!: number | null;

  @ApiProperty({ nullable: true, description: 'BigInt serializado como string' })
  capacidadMaxima!: string | null;

  @ApiProperty({ nullable: true })
  elegibilidadFacultad!: string | null;

  @ApiProperty({ type: [String] })
  elegibilidadCarreras!: string[];

  @ApiProperty({ nullable: true })
  elegibilidadTipoUsuario!: string | null;

  @ApiProperty({ nullable: true })
  elegibilidadEstadoAcademico!: string | null;

  @ApiProperty({ nullable: true })
  padronConfiguradoEn!: Date | null;

  static fromDomain(election: Election): RollConfigResponseDto {
    const dto = new RollConfigResponseDto();
    dto.profundidadArbol = election.profundidadArbol;
    dto.capacidadMaxima = election.capacidadMaxima?.toString() ?? null;
    dto.elegibilidadFacultad = election.elegibilidadFacultad;
    dto.elegibilidadCarreras = election.elegibilidadCarreras;
    dto.elegibilidadTipoUsuario = election.elegibilidadTipoUsuario;
    dto.elegibilidadEstadoAcademico = election.elegibilidadEstadoAcademico;
    dto.padronConfiguradoEn = election.padronConfiguradoEn;
    return dto;
  }
}
