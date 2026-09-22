export type FacultadSso = 'FICCT';
export type CarreraSso =
  | 'INGENIERIA_SISTEMAS'
  | 'INGENIERIA_INFORMATICA'
  | 'INGENIERIA_REDES_TELECOMUNICACIONES'
  | 'INGENIERIA_ROBOTICA';
export type TipoUsuarioSso = 'ESTUDIANTE' | 'DOCENTE' | 'ADMINISTRATIVO';
export type EstadoAcademicoSso = 'ACTIVO' | 'INACTIVO';

export class MockSsoUser {
  constructor(
    public readonly id: string,
    public readonly codigoInstitucional: string,
    public readonly passwordHash: string,
    public readonly nombreCompleto: string,
    public readonly facultad: FacultadSso,
    public readonly carrera: CarreraSso,
    public readonly tipoUsuario: TipoUsuarioSso,
    public readonly estadoAcademico: EstadoAcademicoSso,
    public readonly createdAt: Date,
  ) {}
}
