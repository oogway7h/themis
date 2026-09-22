# themis-web

Portal administrativo y anfitrión del código de generación de pruebas ZK. Contexto de producto completo en [`../docs/diseno-consolidado.md`](../docs/diseno-consolidado.md).

**No es una vía de voto público.** El único votante que toca este código lo hace indirectamente: `themis-app` abre esta app dentro de un WebView interno contra la ruta `/prove` (`src/features/prove/`, implementada — snarkjs real vía `@semaphore-protocol/proof`, artefactos del circuito descargados del CDN oficial `snark-artifacts.pse.dev`) para reusar el snarkjs/Circom en JS, y recibe la prueba de vuelta por `postMessage` (`window.ThemisVoteChannel`). Nadie que entre desde un navegador normal puede votar — la página se niega a operar sin ese channel. Esta app es para Admin/Autoridad/Auditor/público (resultados en vivo, `/tally`), más esa ruta interna consumida por la app móvil.

## Stack

Vite 8 + React 18 + TypeScript, TanStack Router (rutas basadas en archivos, `src/routes/`) + TanStack Query, Tailwind v4, shadcn/ui (estilo `new-york`, base color `neutral` — **sin personalizar todavía**, ver nota de diseño abajo), Vitest + Testing Library.

## Arranque local

```bash
pnpm install
cp .env.example .env
pnpm dev
```

- Dev server: `http://localhost:5173`
- Depende de `themis-core` corriendo en `http://localhost:3000` (`VITE_API_BASE_URL` en `.env`)

## Estructura

```
src/routes/            Rutas TanStack Router (file-based)
src/features/          Una carpeta por feature (auth, demo, ...)
src/components/ui/     Componentes shadcn instalados (Card, StatusBadge, Button, Input, Label)
src/styles/index.css   Variables de tema Tailwind/shadcn
src/api/generated/     Cliente generado desde el OpenAPI de themis-core (si existe)
```

## Estado del diseño visual

`src/styles/index.css` trae la paleta **por defecto** de shadcn (`new-york` + `neutral`) — escala de grises sin saturación, sin tipografía custom en `index.html`, sin logo ni branding de Themis todavía. Dark mode ya está montado (clase `.dark`) pero también en gris neutro. Si se define una identidad visual, tocar las variables `--primary`/`--accent`/etc. en ese archivo.

## Auth

El login de Admin/Autoridad/Auditor (`src/routes/login.tsx`, `src/features/auth/`) habla con `POST /api/v1/auth/login` de themis-core, que **responde con una cookie httpOnly** (`access_token`), no con un token en el body. El cliente HTTP debe mandar `credentials: 'include'` (o equivalente) en cada request — no hay token que guardar manualmente en `localStorage`. Ver `themis-core/src/modules/auth/README.md` para el contrato completo y las credenciales de prueba sembradas (`admin@themis.dev` / `123123`, etc.).

## Ruta `/prove` — implementada

`src/routes/prove.tsx` + `src/features/prove/pages/ProvePage.tsx`. Pública (fuera de `_authenticated/`, sin cookie), no linkeada desde `nav-items.ts` (mismo precedente que `/demo`). Expone `window.generateVoteProof(json)`, hace `fetch` directo a `voting-context` de themis-core (el `apiBaseUrl` viaja en el payload que manda la app, no se asume un host fijo), arma el `Group` de Semaphore y genera la prueba con `@semaphore-protocol/proof`. Si se abre en un navegador normal (sin `window.ThemisVoteChannel`), no hace nada — solo muestra un aviso.

## CORS para desarrollo con Flutter Web/Chrome

Si `themis-app` corre en modo Chrome (`flutter run -d chrome`) en vez de dispositivo/emulador, su origen debe agregarse a `CORS_ORIGINS` en el `.env` de `themis-core` — si no, las llamadas a la API fallan silenciosamente por CORS.
