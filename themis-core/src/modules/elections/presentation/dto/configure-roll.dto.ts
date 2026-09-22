import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional } from 'class-validator';
import { MIN_TREE_DEPTH, MAX_TREE_DEPTH } from '../../domain/election.constants';
import type {
  FacultadSso,
  CarreraSso,
  TipoUsuarioSso,
  EstadoAcademicoSso,
} from '../../../mock-sso/domain/mock-sso-user.entity';

const FACULTADES: FacultadSso[] = ['FICCT'];
const CARRERAS: CarreraSso[] = [
  'INGENIERIA_SISTEMAS',
  'INGENIERIA_INFORMATICA',
  'INGENIERIA_REDES_TELECOMUNICACIONES',
  'INGENIERIA_ROBOTICA',
];
const TIPOS_USUARIO: TipoUsuarioSso[] = ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'];
const ESTADOS_ACADEMICOS: EstadoAcademicoSso[] = ['ACTIVO', 'INACTIVO'];

// El rango [MIN_TREE_DEPTH, MAX_TREE_DEPTH] es una regla de negocio (capacidad estructural
// del árbol de Merkle): se valida en ConfigureElectionRollUseCase (assertTreeDepthInRange)
// para que la respuesta incluya el code ELECTION_TREE_DEPTH_OUT_OF_RANGE, no el 400
// genérico de ValidationPipe. Los decoradores @ApiProperty de min/max acá son solo
// informativos para Swagger.
export class ConfigureRollDto {
  @ApiProperty({ minimum: MIN_TREE_DEPTH, maximum: MAX_TREE_DEPTH, example: 13 })
  @IsInt()
  profundidadArbol!: number;

  @ApiProperty({ enum: FACULTADES })
  @IsIn(FACULTADES)
  elegibilidadFacultad!: FacultadSso;

  @ApiPropertyOptional({ enum: CARRERAS, isArray: true, default: [] })
  @IsOptional()
  @IsArray()
  @IsIn(CARRERAS, { each: true })
  elegibilidadCarreras: CarreraSso[] = [];

  @ApiProperty({ enum: TIPOS_USUARIO })
  @IsIn(TIPOS_USUARIO)
  elegibilidadTipoUsuario!: TipoUsuarioSso;

  @ApiProperty({ enum: ESTADOS_ACADEMICOS })
  @IsIn(ESTADOS_ACADEMICOS)
  elegibilidadEstadoAcademico!: EstadoAcademicoSso;
}
