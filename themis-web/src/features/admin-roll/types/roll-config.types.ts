// Contrato TS a mano, siguiendo themis-core/src/modules/elections/election.contract.json.
// TODO: reemplazar por tipos generados cuando se instale openapi-typescript.
// Valores de catálogo copiados de themis-core/prisma/schema.prisma — mantener sincronizados
// a mano hasta que exista un endpoint de catálogo o codegen de enums.

export type FacultadSso = 'FICCT';

export type CarreraSso =
  | 'INGENIERIA_SISTEMAS'
  | 'INGENIERIA_INFORMATICA'
  | 'INGENIERIA_REDES_TELECOMUNICACIONES'
  | 'INGENIERIA_ROBOTICA';

export type TipoUsuarioSso = 'ESTUDIANTE' | 'DOCENTE' | 'ADMINISTRATIVO';

export type EstadoAcademicoSso = 'ACTIVO' | 'INACTIVO';

export interface RollConfigDto {
  profundidadArbol: number | null;
  capacidadMaxima: string | null;
  elegibilidadFacultad: FacultadSso | null;
  elegibilidadCarreras: CarreraSso[];
  elegibilidadTipoUsuario: TipoUsuarioSso | null;
  elegibilidadEstadoAcademico: EstadoAcademicoSso | null;
  padronConfiguradoEn: string | null;
}

export interface ConfigureRollRequest {
  profundidadArbol: number;
  elegibilidadFacultad: FacultadSso;
  elegibilidadCarreras: CarreraSso[];
  elegibilidadTipoUsuario: TipoUsuarioSso;
  elegibilidadEstadoAcademico: EstadoAcademicoSso;
}
