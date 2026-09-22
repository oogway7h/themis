import { Link } from '@tanstack/react-router';
import { BarChart3, ChevronLeft, Clock, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART_COLORS } from '@/lib/chart-colors';
import { PublicHeader } from '../components/PublicHeader';
import { useTally } from '../hooks/use-tally';
import type { PublicElectionStatus } from '../types/tally.types';

export interface VotacionDetallePageProps {
  electionId: string;
}

const LIVE_STATUSES: PublicElectionStatus[] = ['VOTACION_ABIERTA'];

// CU-11: conteo en vivo, publico (sin auth). Se refresca solo (useTally),
// funciona tanto durante VOTACION_ABIERTA como despues de CERRADA (en ese
// caso refleja el ultimo estado sincronizado, no necesariamente el snapshot
// inmutable de CU-14 -- para eso esta la auditoria).
export function VotacionDetallePage({ electionId }: VotacionDetallePageProps) {
  const tallyQuery = useTally(electionId);
  const tally = tallyQuery.data;
  const total = tally?.totalVotes ?? 0;
  const isLive = tally ? LIVE_STATUSES.includes(tally.estado) : false;
  const opciones = tally?.opciones ?? [];

  const maxVotes = Math.max(0, ...opciones.map((o) => o.voteCount));
  const leadersCount = opciones.filter((o) => o.voteCount === maxVotes).length;
  const hasSingleLeader = total > 0 && leadersCount === 1;
  const leaderIndex = hasSingleLeader ? opciones.findIndex((o) => o.voteCount === maxVotes) : -1;
  const leader = leaderIndex >= 0 ? opciones[leaderIndex] : null;
  const leaderColor = leaderIndex >= 0 ? CHART_COLORS[leaderIndex % CHART_COLORS.length] : null;
  const leaderPct = leader && total > 0 ? Math.round((leader.voteCount / total) * 100) : 0;

  let cumulative = 0;
  const donutStops = opciones.map((option, index) => {
    const pct = total === 0 ? 0 : (option.voteCount / total) * 100;
    const start = cumulative;
    cumulative += pct;
    return `var(${CHART_COLORS[index % CHART_COLORS.length].cssVar}) ${start}% ${cumulative}%`;
  });
  const donutBackground =
    total === 0 || opciones.length === 0 ? 'var(--muted)' : `conic-gradient(${donutStops.join(', ')})`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <Link
          to="/votaciones"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Volver a votaciones
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {tally ? tally.estado.replaceAll('_', ' ') : 'Conteo en vivo'}
            </h1>
            {tally ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{total}</span> voto{total === 1 ? '' : 's'} totales ·
                actualizado {new Date(tally.asOf).toLocaleTimeString('es-BO')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Se actualiza automáticamente cada pocos segundos.</p>
            )}
          </div>
          {tally ? (
            <span
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold ${
                isLive ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full bg-brand ${isLive ? 'motion-safe:animate-pulse' : ''}`}
              />
              {isLive ? 'En vivo' : 'Cerrada'}
            </span>
          ) : null}
        </div>

        {tallyQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            No se pudo cargar el conteo.
          </p>
        ) : null}

        {!tally && tallyQuery.isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        ) : null}

        {tally ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="flex-row items-center gap-3.5 px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-brand-soft">
                  <BarChart3 className="size-5 text-brand-strong" strokeWidth={1.8} />
                </span>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                    Votos totales
                  </p>
                  <p className="text-lg font-extrabold text-foreground">{total}</p>
                </div>
              </Card>

              <Card className="flex-row items-center gap-3.5 px-5 py-4">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-[11px] ${
                    leaderColor ? leaderColor.soft : 'bg-muted'
                  }`}
                >
                  <Trophy
                    className={`size-5 ${leaderColor ? leaderColor.text : 'text-muted-foreground'}`}
                    strokeWidth={1.8}
                  />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Al frente</p>
                  <p className="truncate text-lg font-extrabold text-foreground">
                    {leader ? `${leader.nombre} · ${leaderPct}%` : 'Sin definir'}
                  </p>
                </div>
              </Card>

              <Card className="flex-row items-center gap-3.5 px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-muted">
                  <Clock className="size-5 text-muted-foreground" strokeWidth={1.8} />
                </span>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Actualizado</p>
                  <p className="text-lg font-extrabold text-foreground">
                    {new Date(tally.asOf).toLocaleTimeString('es-BO')}
                  </p>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
              <Card className="px-6">
                <h2 className="text-base font-bold text-foreground">Votos por opción</h2>
                <div className="space-y-5">
                  {opciones.map((option, index) => {
                    const pct = total === 0 ? 0 : Math.round((option.voteCount / total) * 100);
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    const isLeader = hasSingleLeader && option.voteCount === maxVotes;
                    return (
                      <div key={option.optionId} className="space-y-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            {option.nombre}
                            {isLeader ? (
                              <span className="text-xs font-normal text-muted-foreground">líder</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-[13px] text-muted-foreground">
                            <span className="font-bold text-foreground">{option.voteCount}</span> · {pct}%
                          </span>
                        </div>
                        <div className="h-3.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${color.bg} transition-all duration-500 ease-out`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="px-6">
                <h2 className="text-base font-bold text-foreground">Distribución de votos</h2>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="relative size-40 shrink-0 rounded-full" style={{ background: donutBackground }}>
                    <div className="absolute inset-[26px] flex flex-col items-center justify-center rounded-full bg-card shadow-[inset_0_0_0_1px_var(--border)]">
                      <span className="text-2xl leading-none font-extrabold text-foreground">{total}</span>
                      <span className="mt-0.5 text-[11px] text-muted-foreground">votos</span>
                    </div>
                  </div>
                  <div className="min-w-[160px] flex-1 space-y-2.5">
                    {opciones.map((option, index) => {
                      const pct = total === 0 ? 0 : Math.round((option.voteCount / total) * 100);
                      const color = CHART_COLORS[index % CHART_COLORS.length];
                      return (
                        <div key={option.optionId} className="flex items-center gap-2.5">
                          <span className={`size-2.5 shrink-0 rounded-full ${color.bg}`} />
                          <span className="flex-1 truncate text-[13.5px] font-semibold text-foreground">
                            {option.nombre}
                          </span>
                          <span className="text-[13.5px] font-bold text-foreground">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
