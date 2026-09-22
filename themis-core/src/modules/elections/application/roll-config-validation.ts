import type {
  FacultadSso,
  CarreraSso,
  TipoUsuarioSso,
  EstadoAcademicoSso,
} from '../../mock-sso/domain/mock-sso-user.entity';
import { MIN_TREE_DEPTH, MAX_TREE_DEPTH } from '../domain/election.constants';
import {
  ElectionTreeDepthOutOfRangeError,
  ElectionEligibilityInvalidCatalogValueError,
} from './election.errors';

const FACULTADES: FacultadSso[] = ['FICCT'];
const CARRERAS: CarreraSso[] = [
  'INGENIERIA_SISTEMAS',
  'INGENIERIA_INFORMATICA',
  'INGENIERIA_REDES_TELECOMUNICACIONES',
  'INGENIERIA_ROBOTICA',
];
const TIPOS_USUARIO: TipoUsuarioSso[] = ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'];
const ESTADOS_ACADEMICOS: EstadoAcademicoSso[] = ['ACTIVO', 'INACTIVO'];

export function assertTreeDepthInRange(depth: number): void {
  if (depth < MIN_TREE_DEPTH || depth > MAX_TREE_DEPTH) {
    throw new ElectionTreeDepthOutOfRangeError();
  }
}

export interface EligibilityCatalogInput {
  elegibilidadFacultad: FacultadSso;
  elegibilidadCarreras: CarreraSso[];
  elegibilidadTipoUsuario: TipoUsuarioSso;
  elegibilidadEstadoAcademico: EstadoAcademicoSso;
}

export function assertEligibilityCatalogValues(input: EligibilityCatalogInput): void {
  if (!FACULTADES.includes(input.elegibilidadFacultad)) {
    throw new ElectionEligibilityInvalidCatalogValueError();
  }
  if (input.elegibilidadCarreras.some((carrera) => !CARRERAS.includes(carrera))) {
    throw new ElectionEligibilityInvalidCatalogValueError();
  }
  if (!TIPOS_USUARIO.includes(input.elegibilidadTipoUsuario)) {
    throw new ElectionEligibilityInvalidCatalogValueError();
  }
  if (!ESTADOS_ACADEMICOS.includes(input.elegibilidadEstadoAcademico)) {
    throw new ElectionEligibilityInvalidCatalogValueError();
  }
}
