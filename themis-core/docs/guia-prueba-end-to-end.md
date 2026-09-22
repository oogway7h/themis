# Guía: probar la Fase 1 de punta a punta

Cómo levantar el stack local y comprobar que un votante se registra y su commitment queda en la
blockchain. Hay dos caminos: el **script automático** (2-3 min, simula la app por HTTP) y el **camino
real** con el portal web y la app móvil. El voto (CU-10) no existe todavía: esta guía llega hasta la
inserción on-chain.

## 1. Preparar el entorno (una vez)

Requisitos: Node 24 (con Node 22 el backend corre, pero `pnpm test` falla), pnpm, Docker Desktop (solo si
usas Postgres local).

**Base de datos.** Neon (ver `.env.example`) o Postgres local. Ejemplo local:

```bash
docker run -d --name themis-db -e POSTGRES_USER=themis -e POSTGRES_PASSWORD=themis \
  -e POSTGRES_DB=themisdb -p 5436:5432 postgres:16-alpine
# .env -> DATABASE_URL y DIRECT_URL: postgresql://themis:themis@localhost:5436/themisdb
```

**Backend** (`themis-core`):

```bash
pnpm install
cp .env.example .env                      # completa lo que falte
pnpm registration:generate-signing-key    # imprime las dos claves JWK para el .env
pnpm prisma:deploy                        # aplica las migraciones
pnpm prisma:generate
pnpm run seed:platform-users              # admin, autoridad, auditor y superusuario (clave 123123)
pnpm run seed:mock-sso                    # ~5000 estudiantes de prueba (clave 123123)
```

Cuentas sembradas: `admin@themis.dev`, `superusuario@themis.dev`, `autoridad@themis.dev`,
`auditor@themis.dev`, todas con contraseña `123123`. Votantes: códigos institucionales desde
`221000000` en adelante (por ejemplo `221000002`, `221000100`), contraseña `123123`. Cada votante solo
puede registrarse **una vez por elección**.

## 2. Levantar el stack

| Terminal | Comando | Notas |
|---|---|---|
| 1 | `pnpm chain:node` | Nodo Hardhat local. Déjalo abierto |
| 2 | `pnpm chain:deploy:local` y luego `pnpm chain:deploy:semaphore:local` | **En ese orden**, con el nodo ya arriba. La primera vez pega en tu `.env` las líneas `CONTRACT_ADDRESS=` y `SEMAPHORE_REGISTRY_ADDRESS=` que imprimen; en un nodo recién iniciado siempre salen las mismas (ver [`insercion-onchain-semaphore.md`](./insercion-onchain-semaphore.md)) |
| 3 | `pnpm start:dev` | Backend en `http://localhost:3000` (Swagger en `/docs`) |
| 4 | `pnpm dev` en `themis-web` | Portal en `http://localhost:5173` |

**Cada vez que reinicies el nodo (terminal 1) tienes que repetir los dos deploys**: Hardhat pierde todo su
estado. Si no lo haces, la inserción falla con `No se encontro el evento GroupCreated`.

## 3A. Camino automático (sin la app móvil)

Con los pasos 1 y 2 hechos:

```bash
pnpm run test:manual-flow
```

El script crea 3 votantes, 5 cuentas de autoridad y una elección; espera a que el cron la abra sola;
registra las 3 credenciales con identidades Semaphore reales; espera al cierre del checkpoint; aprueba el
lote con 3 autoridades; y comprueba que `onChainTxHash` y `merkleRootAfter` tengan forma real. Termina con
`OK: onChainTxHash y merkleRootAfter tienen forma real`. Los datos quedan en la base (nada se borra).

## 3B. Camino real: portal + app móvil

### a) Crear y configurar la elección (portal, como `admin@themis.dev`)

1. **Cuentas de autoridad**: entra como `superusuario@themis.dev` → Usuarios y crea cuentas con rol
   `AUTORIDAD_REGISTRO` hasta tener 5 (la sembrada `autoridad@themis.dev` cuenta como una). Apunta sus
   contraseñas.
2. **Elección**: Elecciones → Nueva elección. Pon `registroInicio` en el pasado o ahora, y `registroFin`
   varios días adelante; la votación después del registro.
3. En el detalle de la elección, en este orden y **mientras siga en Borrador**:
   - **Padrón**: profundidad del árbol (por ejemplo 13), FICCT, tipo de usuario y estado académico
     que coincidan con tus votantes de prueba.
   - **Checkpoints**: para probar, intervalo de **5 minutos** (el mínimo). Por defecto son 60.
   - **Autoridades**: designa las 5 cuentas.
4. **La elección se abre sola** en menos de un minuto (pasa a "Registro abierto"), porque ya llegó
   `registroInicio` y están el padrón y las 5 autoridades. Si no abre, mira el log del backend: dice qué
   falta. Ver [`ciclo-de-vida-elecciones.md`](./ciclo-de-vida-elecciones.md). Una vez abierta, el padrón y
   la política ya no se pueden cambiar.

### b) Registrar votantes (app móvil)

1. En `themis-app/assets/.env` pon `API_BASE_URL` según dónde corras la app y **reinicia la app**:
   - Emulador Android: `http://10.0.2.2:3000/api/v1`
   - Celular físico en tu Wi-Fi: `http://<IP-de-tu-PC>:3000/api/v1` (el backend escucha en `0.0.0.0`; si no
     conecta, revisa el firewall de Windows para el puerto 3000)
   - Simulador iOS o Chrome: `http://localhost:3000/api/v1`
2. La app trae **fijo** el id de la elección (`_placeholderElectionId` en
   `lib/features/auth/login_result_page.dart`; aún no hay pantalla para elegir). Cámbialo por el id de tu
   elección (está en la URL del portal: `/admin/elections/<id>`).
3. Entra con un código de votante y `123123`. La app genera la identidad, ciega el commitment, lo registra y
   muestra "Credencial certificada lista".
4. Espera el **delay aleatorio de 30 a 120 s** y **abre la app otra vez** (o vuélvela a poner en primer
   plano): la credencial solo se presenta al abrir la app, no en segundo plano.

### c) Checkpoint y aprobación

1. El checkpoint cierra cada `checkpointIntervalMinutes`. Al abrirse el registro se cierra uno **vacío** que
   ancla el reloj, así que el primer lote llega ese intervalo después de la apertura, y solo si ya hay
   credenciales presentadas. Si presentas justo después de un cierre, esperas el siguiente.
2. Entra al portal como una de las autoridades → **Mis elecciones** → tu elección → aparece un lote
   "Pendiente de aprobación" con las credenciales.
3. Abre el lote y pulsa **Aprobar lote**. Repite con **otras dos** autoridades distintas (cada una solo
   puede aprobar una vez). La 3ª deja el lote en **Insertado**, con hash de transacción y raíz.
4. Si queda en "Reintentando inserción", mira el log del backend y la tabla de problemas de
   [`insercion-onchain-semaphore.md`](./insercion-onchain-semaphore.md); el cron de reintento corre cada 5
   minutos.

### d) Comprobar en la blockchain

Con el script de [`insercion-onchain-semaphore.md`](./insercion-onchain-semaphore.md): el grupo debe tener
tantos miembros como credenciales de lotes `INSERTED`, y su raíz debe coincidir con `merkle_root` de la
elección.

## Lo que hoy NO se ve

- La **app no muestra** si el lote fue aprobado ni si el commitment ya está en el árbol: termina en
  "Credencial certificada lista". Ningún endpoint le permite consultarlo. Es un pendiente de la Fase 2.
- Las **alertas de ritmo** (CU-06) existen en el backend (`GET /elections/:id/rate-alerts`) pero no tienen
  pantalla.
- El **auditor** no tiene pantalla de lotes (no puede listar elecciones).

## Fallos frecuentes

| Qué ves | Causa probable |
|---|---|
| Registro rechazado como duplicado | Ese votante ya se registró en esta elección; usa otro código |
| La app no conecta | `API_BASE_URL` incorrecto para tu dispositivo, o firewall |
| La elección sigue en Borrador | Falta el padrón o alguna autoridad; el log del backend lo dice |
| No aparece ningún lote | Aún no hay credenciales presentadas (¿reabriste la app tras el delay?) o no llegó el siguiente checkpoint |
| Lote en "Reintentando inserción" | Cadena reiniciada sin redesplegar, u otro error; ver la tabla de problemas del doc de inserción |
| `EADDRINUSE` en 8545 o 3000 | Ya hay un nodo o backend corriendo (a veces un proceso hijo de Node que sobrevivió); ciérralo |
