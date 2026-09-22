import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useElection } from '../hooks/use-election';
import { ElectionFormDrawer } from '../components/ElectionFormDrawer';
import { AuthoritiesPanel } from '../components/AuthoritiesPanel';
import { CheckpointPolicyForm } from '../components/CheckpointPolicyForm';
import { RollConfigForm } from '@/features/admin-roll/components/RollConfigForm';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'datos', label: 'Datos maestros' },
  { id: 'padron', label: 'Padrón' },
  { id: 'autoridades', label: 'Autoridades' },
  { id: 'checkpoints', label: 'Checkpoints' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export interface ElectionDetailPageProps {
  electionId: string;
}

/**
 * Detalle de una elección con 4 pestañas (una por HU: 01 datos, 02 padrón,
 * 03 autoridades, 04 checkpoints). Se usa un tab interno con useState en vez
 * de sub-rutas anidadas de TanStack Router — simplificación deliberada sobre
 * lo documentado en docs/UT/HU02..04/UT-WEB (ver decisión de implementación).
 */
export function ElectionDetailPage({ electionId }: ElectionDetailPageProps) {
  const navigate = useNavigate();
  const electionQuery = useElection(electionId);
  const [tab, setTab] = React.useState<TabId>('datos');
  const [editOpen, setEditOpen] = React.useState(false);

  if (electionQuery.isLoading || !electionQuery.data) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  const election = electionQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{election.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            Estado: {election.estado} · {election.mecanismoCriptografico} · Umbral{' '}
            {election.umbralFirmas}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({ to: '/elections/$electionId/batches', params: { electionId } })
            }
          >
            Ver lotes
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
            Editar datos maestros
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              'px-4 py-2 text-sm font-medium',
              tab === item.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'datos' ? (
        <div className="space-y-2 text-sm">
          <p>{election.descripcion || 'Sin descripción.'}</p>
          <ul className="list-inside list-disc">
            {election.opciones.map((option) => (
              <li key={option.id}>{option.nombre}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === 'padron' ? (
        <RollConfigForm electionId={electionId} electionEstado={election.estado} />
      ) : null}

      {tab === 'autoridades' ? (
        <AuthoritiesPanel electionId={electionId} electionEstado={election.estado} />
      ) : null}

      {tab === 'checkpoints' ? (
        <CheckpointPolicyForm electionId={electionId} electionEstado={election.estado} />
      ) : null}

      <ElectionFormDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        election={election}
      />
    </div>
  );
}
