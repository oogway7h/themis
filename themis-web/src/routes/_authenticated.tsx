import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/features/auth/lib/require-auth';
import { AppLayout } from '@/layout/AppLayout';

/**
 * Layout "pathless" (el prefijo `_` no agrega segmento a la URL): agrupa
 * todas las rutas administrativas que exigen sesión. El guard vive una
 * sola vez acá, en vez de repetirse en el `beforeLoad` de cada ruta hija
 * (`src/routes/_authenticated/*`) — agregar una ruta protegida nueva es
 * tan simple como crear el archivo dentro de esta carpeta. `AppLayout`
 * (sidebar + header) envuelve el `<Outlet />` acá — por eso `/login`, que
 * no está bajo este layout pathless, nunca lo ve.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context }) => requireAuth(context.auth),
  component: AppLayout,
});
