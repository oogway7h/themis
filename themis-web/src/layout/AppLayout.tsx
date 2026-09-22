import { Outlet } from '@tanstack/react-router';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';

/**
 * Chrome compartido de toda la zona autenticada: envuelve `<Outlet />` en
 * `_authenticated.tsx`, así que `/login` (fuera de ese layout pathless)
 * nunca lo ve. Sin `children`: es de uso único, montado una sola vez desde
 * la ruta.
 */
export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="relative h-svh overflow-hidden bg-background">
        {/* Fondo de marca: resplandor del acento + retícula tenue. Decorativo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_100%_0%,color-mix(in_oklab,var(--brand)_14%,transparent),transparent),radial-gradient(circle,color-mix(in_oklab,var(--ink)_9%,transparent)_1px,transparent_1px)] bg-[size:auto,22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        <Header />
        <main className="relative mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
