import { createRouter } from '@tanstack/react-router';
import type { AuthContextValue } from '@/features/auth/lib/auth-context';
// Generado por @tanstack/router-plugin a partir de src/routes/**. No editar
// a mano — se regenera solo al correr `pnpm dev` o `pnpm build`.
import { routeTree } from './routeTree.gen';

export const router = createRouter({
  routeTree,
  context: { auth: undefined as unknown as AuthContextValue },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
