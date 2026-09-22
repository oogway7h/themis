import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSession } from '@/features/auth/hooks/use-session';
import { useBatchDetail } from '../hooks/use-batch-detail';
import { useApproveBatch } from '../hooks/use-approve-batch';
import { BatchStatusBadge } from '../components/BatchStatusBadge';
import { ApprovalProgress } from '../components/ApprovalProgress';
import { approveErrorMessage } from '../lib/approve-error-message';

export interface BatchDetailPageProps {
  electionId: string;
  batchId: string;
}

export function BatchDetailPage({ electionId, batchId }: BatchDetailPageProps) {
  const navigate = useNavigate();
  const { session } = useSession();
  const detailQuery = useBatchDetail(electionId, batchId);
  const approve = useApproveBatch(electionId, batchId);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  function goBack() {
    navigate({ to: '/elections/$electionId/batches', params: { electionId } });
  }

  if (detailQuery.isError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive" role="alert">
          No se pudo cargar el lote.
        </p>
        <Button type="button" variant="outline" onClick={goBack}>
          <ArrowLeft className="size-4" />
          Volver a los lotes
        </Button>
      </div>
    );
  }

  if (detailQuery.isLoading || !detailQuery.data) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  const batch = detailQuery.data;
  const isAuthority = session?.role === 'AUTORIDAD_REGISTRO';
  const isPending = batch.status === 'PENDING_APPROVAL';
  const canApprove = isAuthority && isPending && !batch.yaAprobado;

  function handleConfirm() {
    approve.mutate(undefined, {
      onSuccess: () => setConfirmOpen(false),
      // Si otra autoridad cambio el estado mientras tanto, se refresca lo que se ve.
      onError: () => void detailQuery.refetch(),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="page-title">Lote de checkpoint</h1>
          <BatchStatusBadge status={batch.status} />
        </div>
        <Button type="button" variant="outline" onClick={goBack}>
          <ArrowLeft className="size-4" />
          Volver a los lotes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>
            Cerrado el {new Date(batch.closedAt).toLocaleString('es-BO')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            <span className="font-medium">{batch.credentialCount}</span> credenciales en este lote.
          </p>
          <ApprovalProgress
            approvalCount={batch.approvalCount}
            approvalsRequired={batch.approvalsRequired}
            approvals={batch.approvals}
          />
        </CardContent>
      </Card>

      {batch.status === 'APPROVED' ? (
        <p className="text-sm text-muted-foreground">
          Se alcanzó el número de aprobaciones. El lote se está insertando en la cadena.
        </p>
      ) : null}

      {batch.status === 'INSERTION_FAILED' ? (
        <p className="text-sm text-muted-foreground" role="status">
          {isAuthority
            ? 'Tu aprobación quedó registrada. '
            : 'Las aprobaciones quedaron registradas. '}
          La inserción en la cadena falló y el sistema la reintentará automáticamente.
        </p>
      ) : null}

      {batch.status === 'INSERTED' ? (
        <Card>
          <CardHeader>
            <CardTitle>Inserción on-chain</CardTitle>
            <CardDescription>
              {batch.insertedAt
                ? `Insertado el ${new Date(batch.insertedAt).toLocaleString('es-BO')}`
                : 'Insertado'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Hash de la transacción</p>
              <code className="break-all text-xs">{batch.onChainTxHash}</code>
            </div>
            <div>
              <p className="font-medium">Raíz del árbol tras la inserción</p>
              <code className="break-all text-xs">{batch.merkleRootAfter}</code>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isAuthority ? (
        <div className="space-y-2">
          <Button type="button" disabled={!canApprove} onClick={() => setConfirmOpen(true)}>
            Aprobar lote
          </Button>
          {batch.yaAprobado ? (
            <p className="text-sm text-muted-foreground">Ya aprobaste este lote.</p>
          ) : !isPending ? (
            <p className="text-sm text-muted-foreground">
              El lote ya no está pendiente de aprobación.
            </p>
          ) : null}
        </div>
      ) : null}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            approve.reset();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprobar lote</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a aprobar un lote de {batch.credentialCount} credenciales. Tu aprobación queda
              registrada y no se puede deshacer. Con {batch.approvalsRequired} aprobaciones el lote
              se inserta en la cadena.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {approve.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {approveErrorMessage(approve.error)}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleConfirm();
              }}
              disabled={approve.isPending}
            >
              {approve.isPending ? 'Aprobando...' : 'Aprobar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
