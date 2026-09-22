import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { useSession } from '@/features/auth/hooks/use-session';
import { ROLE_LABELS } from '@/features/auth/lib/role-labels';
import { NAV_ITEMS } from '@/layout/nav-items';

/**
 * Landing genérica post-login para los 4 roles. Sin datos falsos ni gráficos
 * todavía: muestra un saludo de marca y accesos directos a las secciones que
 * el rol puede ver (mismas reglas que el sidebar).
 */
export function DashboardPage() {
  const { session } = useSession();

  if (!session) {
    return null;
  }

  const shortcuts = NAV_ITEMS.filter(
    (item) => item.to !== '/dashboard' && item.roles.includes(session.role),
  );
  const firstName = session.nombreCompleto.trim().split(/\s+/)[0];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-ink p-8 text-paper shadow-[0_20px_40px_-24px_rgba(15,23,42,0.6)] lg:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full border-[40px] border-brand/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-2 bottom-8 h-[10px] w-40 rounded-full bg-brand/70"
        />
        <div className="relative max-w-xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-brand uppercase">
            <span className="size-1.5 rounded-full bg-brand" />
            {ROLE_LABELS[session.role]}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
            Hola, {firstName}
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            Bienvenido al portal de Themis. Un voto por persona, sin exponer
            identidades, con resultados que cualquiera puede auditar.
          </p>
        </div>
      </section>

      {shortcuts.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Accesos rápidos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shortcuts.map((item) => (
              <Link key={item.to} to={item.to} className="group block">
                <Card className="h-full gap-0 py-0 transition-all group-hover:-translate-y-0.5 group-hover:border-brand/60 group-hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                      <item.icon className="size-5" />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-foreground">
                      {item.label}
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-brand-strong" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
