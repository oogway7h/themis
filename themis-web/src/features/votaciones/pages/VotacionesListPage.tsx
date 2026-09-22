import { Link } from '@tanstack/react-router';
import { Lock, ShieldCheck, Link2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { usePublicElections } from '../hooks/use-public-elections';
import { PublicHeader } from '../components/PublicHeader';
import type { PublicElectionStatus } from '../types/tally.types';

const STATUS_META: Record<
  PublicElectionStatus,
  { badge: string; badgeClass: string; borderClass: string; caption: string; cta: string; live?: boolean }
> = {
  VOTACION_ABIERTA: {
    badge: 'En vivo',
    badgeClass: 'bg-success-soft text-success',
    borderClass: 'border-l-brand',
    caption: 'La votación está abierta, tu voto cuenta ahora mismo.',
    cta: 'Ver conteo en vivo',
    live: true,
  },
  REGISTRO_ABIERTO: {
    badge: 'Registro abierto',
    badgeClass: 'bg-muted text-foreground',
    borderClass: 'border-l-border',
    caption: 'Podés registrarte como votante desde la app móvil. La votación todavía no empezó.',
    cta: 'Ver estado',
  },
  REGISTRO_CERRADO: {
    badge: 'Registro cerrado',
    badgeClass: 'bg-muted text-muted-foreground',
    borderClass: 'border-l-border',
    caption: 'El registro cerró, la votación abre pronto.',
    cta: 'Ver estado',
  },
  CERRADA: {
    badge: 'Cerrada',
    badgeClass: 'bg-muted text-muted-foreground',
    borderClass: 'border-l-border',
    caption: 'La votación cerró, resultado disponible.',
    cta: 'Ver resultado',
  },
  BORRADOR: {
    badge: 'Borrador',
    badgeClass: 'bg-muted text-muted-foreground',
    borderClass: 'border-l-border',
    caption: 'Todavía no está disponible.',
    cta: 'Ver estado',
  },
};

function Hero() {
  const trustChips = [
    { icon: Lock, label: 'Sin cuenta para consultar' },
    { icon: ShieldCheck, label: 'Prueba zk-SNARK real' },
    { icon: Link2, label: 'Verificable on-chain' },
  ];

  return (
    <section className="flex flex-col items-center gap-6 px-6 py-20 text-center">
      <span className="inline-flex items-center rounded-full bg-brand-soft px-3.5 py-1.5 text-xs font-bold tracking-[0.06em] text-brand-strong uppercase">
        Votación electrónica verificable
      </span>
      <h1 className="max-w-3xl text-4xl font-extrabold tracking-[-0.025em] text-foreground sm:text-5xl">
        Tu voto, verificado por criptografía, no por confianza.
      </h1>
      <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
        Themis es la plataforma de votación para la elección de Representante Estudiantil de
        FICCT. Cada voto se emite con una prueba zk-SNARK y se valida en blockchain: nadie, ni
        siquiera el sistema puede vincular tu identidad con tu elección.
      </p>
      <div className="flex flex-wrap justify-center gap-7">
        {trustChips.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
              <Icon className="size-3.5 text-brand-strong" strokeWidth={1.8} />
            </span>
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// CU-11: pagina publica (sin auth) -- cualquiera puede ver que elecciones
// existen y entrar a su conteo en vivo, sin depender de sesion. Es la
// landing (/) y tambien /votaciones.
export function VotacionesListPage() {
  const electionsQuery = usePublicElections();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <Hero />

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-6 pb-20">
        <div>
          <h2 className="page-title">Votaciones</h2>
          <p className="text-sm text-muted-foreground">
            Elegí una elección para ver su conteo en vivo. Es público, no hace falta iniciar
            sesión.
          </p>
        </div>

        {electionsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : null}

        {electionsQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            No se pudieron cargar las elecciones.
          </p>
        ) : null}

        {electionsQuery.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay elecciones públicas.</p>
        ) : null}

        <div className="space-y-3">
          {electionsQuery.data?.map((election) => {
            const meta = STATUS_META[election.estado];
            return (
              <Link
                key={election.id}
                to="/votaciones/$electionId"
                params={{ electionId: election.id }}
                className="block"
              >
                <Card
                  className={`flex-row items-center gap-4 border-l-4 py-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${meta.borderClass}`}
                >
                  <CardHeader className="flex-1 gap-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-semibold text-foreground">{election.nombre}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.badgeClass}`}
                      >
                        {meta.live ? (
                          <span className="size-1.5 rounded-full bg-brand motion-safe:animate-pulse" />
                        ) : null}
                        {meta.badge}
                      </span>
                    </div>
                    <span className="text-[13.5px] text-muted-foreground">{meta.caption}</span>
                  </CardHeader>
                  <CardContent className="flex shrink-0 items-center gap-1 py-0 text-[13px] font-semibold text-muted-foreground">
                    {meta.cta}
                    <ChevronRight className="size-4" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-7 text-center">
        <p className="text-[13px] text-muted-foreground">
          Themis · Elección Segura y Verificable
        </p>
      </footer>
    </div>
  );
}
