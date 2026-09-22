# Ciclo de vida automático de una elección

El campo `Election.estado` lo avanza **solo** un cron, según las cuatro fechas de la elección. No hay
endpoint ni botón para abrir o cerrar el registro a mano.

## Estados y transiciones

```
BORRADOR → REGISTRO_ABIERTO → REGISTRO_CERRADO → VOTACION_ABIERTA → CERRADA
```

| Transición | Cuándo ocurre |
|---|---|
| `BORRADOR → REGISTRO_ABIERTO` | `registroInicio <= ahora < registroFin` **y** el padrón está configurado **y** hay exactamente 5 autoridades designadas |
| `REGISTRO_ABIERTO → REGISTRO_CERRADO` | `ahora >= registroFin` |
| `REGISTRO_CERRADO → VOTACION_ABIERTA` | `ahora >= votacionInicio` |
| `VOTACION_ABIERTA → CERRADA` | `ahora >= votacionFin` |

- **Un paso por tick.** El cron corre cada minuto. Si el proceso estuvo caído y se saltaron varias
  fechas, las transiciones ocurren en ticks consecutivos, sin saltarse ningún estado.
- **La política de checkpoint no es requisito** para abrir: tiene valores por defecto (60 min y 50
  registros por minuto).
- **Si falta configuración al llegar `registroInicio`**, la elección sigue en `BORRADOR`, se reintenta
  cada minuto y el log avisa qué falta (por ejemplo `padron sin configurar` o `autoridades designadas
  4/5`). Abre en cuanto se completa, mientras no haya pasado `registroFin`.
- **Una elección que sigue en `BORRADOR` cuando ya pasó `registroFin` nunca se abre.**
- Cada cambio usa compare-and-swap (`ElectionRepository.transitionStatus`), así que dos ticks o dos
  instancias del backend no pueden aplicar la misma transición dos veces.

## Qué puede hacerse en cada estado

| Estado | Edición | Registro de votantes | Presentar credencial (*) | Checkpoints |
|---|---|---|---|---|
| `BORRADOR` | Datos, padrón y política editables | No | Aceptada, pero nadie tiene credencial que presentar | No |
| `REGISTRO_ABIERTO` | Padrón y política **bloqueados** (`ELECTION_ROLL_LOCKED`) | Sí | Sí | Cada `checkpointIntervalMinutes` |
| `REGISTRO_CERRADO` | Bloqueado | **No** | **Sí** | Un único checkpoint final |
| `VOTACION_ABIERTA` | Bloqueado | No | Sí | No |
| `CERRADA` | Bloqueado | No | **No** | No |

(*) El backend solo rechaza la presentación (`ElectionClosedError`) cuando la elección está `CERRADA`
(`assertElectionNotClosed`); el registro, en cambio, exige `REGISTRO_ABIERTO` (`assertRegistrationWindowOpen`).

`REGISTRO_CERRADO` cubre el hueco entre `registroFin` y `votacionInicio` (la validación solo exige
`votacionInicio >= registroFin`). Sigue aceptando la **presentación** de credenciales porque el delay
aleatorio de la app puede caer después del cierre, y ejecuta **un** checkpoint final, vencido desde
`registroFin`, para armar el lote con lo que quedó pendiente. Después de ese cierre no hay más
checkpoints: una credencial presentada más tarde queda sin lote.

## Detalles que sorprenden

- **El primer lote no es inmediato.** Al abrirse el registro, el cron de checkpoints cierra un primer
  checkpoint **vacío** que solo ancla el reloj. El primer lote real llega `checkpointIntervalMinutes`
  después de la apertura, y solo si para entonces hay credenciales presentadas.
- **Las fechas se guardan en UTC.** Una elección que empieza el 01/01/2026 00:00 UTC se ve como
  31/12/2025 en un navegador en Bolivia (UTC-4).
- **Los datos sembrados a mano no pasan por el cron de apertura.** Una elección que se dejó en
  `REGISTRO_ABIERTO` directamente en la base sigue su curso normal desde ahí (cierra en `registroFin`),
  pero no se le exige el padrón ni las autoridades.

## Dónde está en el código

- `src/modules/elections/application/election-lifecycle.ts`: función pura `nextStatusByDates`.
- `src/modules/elections/application/advance-election-lifecycle.usecase.ts`: aplica las transiciones y
  verifica los requisitos para abrir.
- `src/modules/elections/infrastructure/election-lifecycle.scheduler.ts`: el cron (`EVERY_MINUTE`).
- `src/modules/checkpoints/application/close-due-checkpoints.usecase.ts`: qué estados cierran
  checkpoints y cuándo vence el de `REGISTRO_CERRADO`.
- Enum en `prisma/schema.prisma` y migración `20260919200000_add_registro_cerrado_state`.
- Tests: `advance-election-lifecycle.usecase.spec.ts`.
