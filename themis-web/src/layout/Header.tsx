import { LogOut } from 'lucide-react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from '@/features/auth/hooks/use-session';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { ROLE_LABELS } from '@/features/auth/lib/role-labels';
import { NAV_ITEMS } from './nav-items';

function initials(nombreCompleto: string): string {
  return nombreCompleto
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Header() {
  const { session } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const section = NAV_ITEMS.filter((item) => pathname.startsWith(item.to)).sort(
    (a, b) => b.to.length - a.to.length,
  )[0];

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: '/login' });
      },
    });
  }

  if (!session) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-card/90 px-4 backdrop-blur-md">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-brand via-brand/20 to-transparent"
      />
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <div className="leading-tight">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-brand-strong uppercase">
            Portal Themis
          </p>
          <p className="text-sm font-semibold text-foreground">{section?.label ?? 'Inicio'}</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-full py-1 pr-1 pl-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50">
          <span className="hidden text-right leading-tight sm:block">
            <span className="block text-sm font-medium text-foreground">
              {session.nombreCompleto}
            </span>
            <span className="block text-xs text-muted-foreground">
              {ROLE_LABELS[session.role]}
            </span>
          </span>
          <Avatar className="size-9 ring-2 ring-brand/60 ring-offset-2 ring-offset-card">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {initials(session.nombreCompleto)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-1 font-normal">
            <span className="text-sm font-medium">{session.nombreCompleto}</span>
            <Badge className="w-fit bg-brand-soft text-brand-strong">
              {ROLE_LABELS[session.role]}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={logout.isPending}
            onSelect={(event) => {
              event.preventDefault();
              handleLogout();
            }}
          >
            <LogOut />
            {logout.isPending ? 'Saliendo...' : 'Cerrar sesión'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
