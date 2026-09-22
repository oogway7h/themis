import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CHART_COLORS } from '@/lib/chart-colors';
import { useBatches } from '@/features/batch-approval/hooks/use-batches';
import { BatchStatusBadge } from '@/features/batch-approval/components/BatchStatusBadge';
import { usePublicElection } from '@/features/votaciones/hooks/use-public-elections';
import { useRateAlerts } from '../hooks/use-rate-alerts';
import { useAuditResult } from '../hooks/use-audit-result';

export interface AuditElectionDetailPageProps {
  electionId: string;
}

function truncateHash(hash: string): string {
  return hash.length <= 16 ? hash : `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

// CU-15: vista de auditoria de solo lectura. Combina el detalle publico de la
// eleccion (nombre, cierre programado -- CU-11, sin auth), el resultado/tally
// (result final si ya cerro CU-14, liveTally siempre disponible), el
// historial de lotes (mismo dato que ve la autoridad, sin boton de aprobar) y
// las alertas de ritmo (CU-06). "Votantes registrados" y "participacion" se
// derivan sumando credentialCount de los lotes ya INSERTED -- no hay campo
// dedicado en el backend para eso.
export function AuditElectionDetailPage({ electionId }: AuditElectionDetailPageProps) {
  const electionQuery = usePublicElection(electionId);
  const batchesQuery = useBatches(electionId);
  const rateAlertsQuery = useRateAlerts(electionId);
  const auditResultQuery = useAuditResult(electionId);

  const election = electionQuery.data;
  const audit = auditResultQuery.data;
  const batches = batchesQuery.data ?? [];
  const insertedBatches = batches.filter((b) => b.status === 'INSERTED');
  const registeredVoters = insertedBatches.reduce((sum, b) => sum + b.credentialCount, 0);

  const liveTally = audit?.liveTally ?? [];
  const totalVotes = audit?.result?.totalVotes ?? liveTally.reduce((sum, o) => sum + o.voteCount, 0);
  const participationPct = registeredVoters > 0 ? Math.round((totalVotes / registeredVoters) * 100) : null;
  const finalBlock = audit?.result?.sourceBlockNumber ?? audit?.chainSync?.lastSyncedBlock ?? null;

  const closedAt = audit?.result ? new Date(audit.result.computedAt) : null;
  const scheduledClose = election ? new Date(election.votacionFin) : null;
  const closeDeltaSeconds =
    closedAt && scheduledClose ? Math.round((closedAt.getTime() - scheduledClose.getTime()) / 1000) : null;

  const submissionCounts = audit?.voteSubmissionCounts;
  const relayPct =
    submissionCounts && submissionCounts.total > 0
      ? Math.round((submissionCounts.relay / submissionCounts.total) * 100)
      : 100;

  let cumulative = 0;
  const donutStops = liveTally.map((option, index) => {
    const pct = totalVotes === 0 ? 0 : (option.voteCount / totalVotes) * 100;
    const start = cumulative;
    cumulative += pct;
    return `var(${CHART_COLORS[index % CHART_COLORS.length].cssVar}) ${start}% ${cumulative}%`;
  });
  const donutBackground =
    totalVotes === 0 || liveTally.length === 0 ? 'var(--muted)' : `conic-gradient(${donutStops.join(', ')})`;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-ink p-8 text-paper">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-brand uppercase">
              Auditoría · CU-15
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {election?.nombre ?? 'Auditoría de elección'}
            </h1>
            <p className="max-w-lg text-[13px] text-slate-400">
              Vista de solo lectura. Ningún dato de esta pantalla permite reconstruir qué votó cada
              persona — el padrón guarda credenciales ciegas, no identidades.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {audit ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-bold">
                {audit.estado.replaceAll('_', ' ')}
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-bold text-slate-400">
              Solo lectura
            </span>
          </div>
        </div>
      </div>

      {!audit && auditResultQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : null}

      {audit ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="gap-1.5 px-5 py-4">
            <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              Votantes registrados
            </p>
            <p className="text-xl font-extrabold text-foreground">{registeredVoters}</p>
            <p className="text-[11.5px] text-muted-foreground">
              {insertedBatches.length} lote{insertedBatches.length === 1 ? '' : 's'} insertado
              {insertedBatches.length === 1 ? '' : 's'} on-chain
            </p>
          </Card>

          <Card className="gap-1.5 px-5 py-4">
            <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Votos emitidos</p>
            <p className="text-xl font-extrabold text-foreground">{totalVotes}</p>
            <p className="text-[11.5px] text-muted-foreground">validados on-chain (zk-SNARK)</p>
          </Card>

          <Card className="gap-1.5 px-5 py-4">
            <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Participación</p>
            <p className="text-xl font-extrabold text-brand-strong">
              {participationPct !== null ? `${participationPct}%` : '—'}
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              {registeredVoters > 0 ? `${totalVotes} de ${registeredVoters} registrados` : 'sin votantes registrados aún'}
            </p>
          </Card>

          <Card className="gap-1.5 px-5 py-4">
            <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Bloque final</p>
            <p className="font-mono text-xl font-extrabold text-foreground">
              {finalBlock !== null ? `#${finalBlock}` : '—'}
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              {audit.chainSync ? `sincronizado hasta #${audit.chainSync.lastSyncedBlock}` : 'sin sincronización aún'}
            </p>
          </Card>

          <Card className="gap-1.5 px-5 py-4">
            <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Cierre</p>
            <p className="text-xl font-extrabold text-foreground">
              {closedAt ? closedAt.toLocaleTimeString('es-BO') : '—'}
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              {scheduledClose
                ? `programado ${scheduledClose.toLocaleTimeString('es-BO')}${
                    closeDeltaSeconds !== null ? ` (+${closeDeltaSeconds}s)` : ''
                  }`
                : 'la elección todavía no cerró'}
            </p>
          </Card>
        </div>
      ) : null}

      {audit ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
          <Card className="gap-6 px-6">
            <div>
              <h2 className="text-base font-bold text-foreground">Resultado por opción</h2>
              <p className="text-[12.5px] text-muted-foreground">
                {audit.result
                  ? 'Conteo final inmutable (CU-14), calculado al cierre'
                  : 'La elección todavía no cerró: se muestra el conteo en vivo'}
              </p>
            </div>

            <div className="space-y-4">
              {liveTally.map((option, index) => {
                const pct = totalVotes === 0 ? 0 : Math.round((option.voteCount / totalVotes) * 100);
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return (
                  <div key={option.optionId} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">{option.nombre}</span>
                      <span className="shrink-0 text-[12.5px] text-muted-foreground">
                        <span className="font-bold text-foreground">{option.voteCount}</span> votos · {pct}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${color.bg}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2.5 border-t border-border pt-4">
              <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Verificación criptográfica
              </span>
              {audit.result ? (
                <>
                  <div className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="text-muted-foreground">Raíz de Merkle final</span>
                    <span className="font-mono">{truncateHash(audit.result.finalMerkleRoot)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="text-muted-foreground">Bloque de origen</span>
                    <span className="font-mono">#{audit.result.sourceBlockNumber}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="text-muted-foreground">Calculado el</span>
                    <span>{new Date(audit.result.computedAt).toLocaleString('es-BO')}</span>
                  </div>
                </>
              ) : (
                <p className="text-[12.5px] text-muted-foreground">
                  Se completa al cerrar la elección (CU-14): raíz de Merkle, bloque de origen y hora
                  exacta del snapshot inmutable.
                </p>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-5">
            <Card className="gap-5 px-6">
              <h2 className="text-base font-bold text-foreground">Distribución de votos</h2>
              <div className="flex flex-wrap items-center gap-6">
                <div className="relative size-36 shrink-0 rounded-full" style={{ background: donutBackground }}>
                  <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-card shadow-[inset_0_0_0_1px_var(--border)]">
                    <span className="text-lg leading-none font-extrabold text-foreground">{totalVotes}</span>
                    <span className="mt-0.5 text-[10.5px] text-muted-foreground">votos</span>
                  </div>
                </div>
                <div className="min-w-[140px] flex-1 space-y-2.5">
                  {liveTally.map((option, index) => {
                    const pct = totalVotes === 0 ? 0 : Math.round((option.voteCount / totalVotes) * 100);
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    return (
                      <div key={option.optionId} className="flex items-center gap-2.5">
                        <span className={`size-2.5 shrink-0 rounded-full ${color.bg}`} />
                        <span className="flex-1 truncate text-[13px] font-semibold text-foreground">
                          {option.nombre}
                        </span>
                        <span className="text-[13px] font-bold text-foreground">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Card className="gap-4 px-6">
              <div>
                <h2 className="text-base font-bold text-foreground">Integridad de emisión</h2>
                <p className="text-[12.5px] text-muted-foreground">
                  Cómo llegó cada voto a la base: directo (relay) o recuperado después
                </p>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-brand" style={{ width: `${relayPct}%` }} />
              </div>
              <div className="flex justify-between text-[12.5px] text-muted-foreground">
                <span>
                  Relay síncrono: <strong className="text-foreground">{submissionCounts?.relay ?? 0}</strong>
                </span>
                <span>
                  Recuperados por sync on-chain:{' '}
                  <strong className="text-foreground">{submissionCounts?.chainSync ?? 0}</strong>
                </span>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      <Card className="px-6">
        <h2 className="mb-4 text-base font-bold text-foreground">Historial de lotes de registro</h2>
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay lotes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cerrado</TableHead>
                <TableHead>Insertado</TableHead>
                <TableHead>Credenciales</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tx on-chain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>{new Date(batch.closedAt).toLocaleString('es-BO')}</TableCell>
                  <TableCell>
                    {batch.insertedAt ? new Date(batch.insertedAt).toLocaleString('es-BO') : '—'}
                  </TableCell>
                  <TableCell>{batch.credentialCount}</TableCell>
                  <TableCell>
                    <BatchStatusBadge status={batch.status} />
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {batch.onChainTxHash ? truncateHash(batch.onChainTxHash) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="flex-row items-center gap-4 px-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-brand-soft">
          <CheckCircle2 className="size-5 text-brand-strong" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-sm font-bold text-foreground">Alertas de ritmo de registro</h2>
          {rateAlertsQuery.data?.length === 0 || !rateAlertsQuery.data ? (
            <p className="text-[13px] text-muted-foreground">
              Sin alertas — el ritmo de registro se mantuvo bajo el umbral configurado durante toda la
              ventana.
            </p>
          ) : (
            <div className="mt-1.5 space-y-1.5">
              {rateAlertsQuery.data.map((alert) => (
                <p key={alert.id} className="text-[13px] text-muted-foreground">
                  {new Date(alert.windowStart).toLocaleString('es-BO')}:{' '}
                  <strong className="text-foreground">{alert.registrationCount}</strong> registros
                  (umbral {alert.thresholdPerMinute}/min)
                </p>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
