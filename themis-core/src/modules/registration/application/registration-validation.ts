import { Election } from '../../elections/domain/election.entity';
import { ElectionClosedError, RegistrationWindowClosedError } from './registration.errors';

// Solo REGISTRO_ABIERTO: aceptar registros con la votacion ya abierta permite
// sumar votantes al padron cuando el conteo en vivo (CU-11) ya muestra
// resultados parciales.
export function assertRegistrationWindowOpen(election: Election): void {
  if (election.estado !== 'REGISTRO_ABIERTO') {
    throw new RegistrationWindowClosedError();
  }
}

// Presentar la credencial es intencionalmente mas permisivo que registrarse:
// el delay aleatorio del lado del cliente puede caer despues de que cierre
// la ventana de registro, y sigue siendo valido mientras la eleccion no haya
// terminado del todo.
export function assertElectionNotClosed(election: Election): void {
  if (election.estado === 'CERRADA') {
    throw new ElectionClosedError();
  }
}
