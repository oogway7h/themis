import { Election, ElectionStatus } from '../domain/election.entity';

/**
 * Siguiente estado que le corresponde a la eleccion segun sus fechas, o null si
 * todavia no toca cambiar. Avanza como maximo un paso por llamada: si el proceso
 * estuvo caido y se saltaron varias fechas, las transiciones ocurren en ticks
 * consecutivos, sin saltarse el estado intermedio.
 *
 * BORRADOR solo abre dentro de la ventana [registroInicio, registroFin): una
 * eleccion que nunca se configuro a tiempo no se abre con la ventana ya vencida.
 * Los requisitos de configuracion para abrir (padron, autoridades) los verifica
 * el caso de uso, no esta funcion.
 */
export function nextStatusByDates(election: Election, now: Date): ElectionStatus | null {
  const t = now.getTime();

  switch (election.estado) {
    case 'BORRADOR':
      return t >= election.registroInicio.getTime() && t < election.registroFin.getTime()
        ? 'REGISTRO_ABIERTO'
        : null;
    case 'REGISTRO_ABIERTO':
      return t >= election.registroFin.getTime() ? 'REGISTRO_CERRADO' : null;
    case 'REGISTRO_CERRADO':
      return t >= election.votacionInicio.getTime() ? 'VOTACION_ABIERTA' : null;
    case 'VOTACION_ABIERTA':
      return t >= election.votacionFin.getTime() ? 'CERRADA' : null;
    default:
      return null;
  }
}
