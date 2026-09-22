import { Link, useRouterState } from '@tanstack/react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useSession } from '@/features/auth/hooks/use-session';
import { ROLE_LABELS } from '@/features/auth/lib/role-labels';
import { NAV_ITEMS } from './nav-items';
import lockupDark from '@/assets/brand/themis-lockup-dark.svg';
import markDark from '@/assets/brand/themis-mark-dark.svg';

export function AppSidebar() {
  const { session } = useSession();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const items = session
    ? NAV_ITEMS.filter((item) => item.roles.includes(session.role))
    : [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:px-2">
        <Link to="/dashboard" aria-label="Themis - inicio" className="flex items-center">
          <img
            src={lockupDark}
            alt="Themis"
            className="h-11 w-auto group-data-[collapsible=icon]:hidden"
          />
          <img
            src={markDark}
            alt="Themis"
            className="hidden size-8 group-data-[collapsible=icon]:block"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pt-4">
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.to}
                    tooltip={item.label}
                    className="h-10 rounded-lg text-[13.5px] data-[active=true]:bg-brand/12 data-[active=true]:text-paper data-[active=true]:shadow-[inset_3px_0_0_var(--brand)] data-[active=true]:[&>svg]:text-brand"
                  >
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="relative overflow-hidden border-t border-sidebar-border p-3 group-data-[collapsible=icon]:hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -bottom-10 size-28 rounded-full border-[14px] border-brand/10"
        />
        <div className="relative space-y-2 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-brand uppercase">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-brand" />
            </span>
            Elección piloto
          </div>
          <p className="text-sm leading-snug font-medium text-paper">Representante FICCT</p>
          {session ? (
            <p className="text-xs text-slate-400">{ROLE_LABELS[session.role]}</p>
          ) : null}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
