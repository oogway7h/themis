import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import type { AuthContextValue } from '@/features/auth/lib/auth-context';

export interface RouterContext {
  auth: AuthContextValue;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
