import { Badge } from '@/components/ui/badge';
import type { BatchStatus } from '../types/batch.types';

const STATUS: Record<
  BatchStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING_APPROVAL: { label: 'Pendiente de aprobación', variant: 'secondary' },
  APPROVED: { label: 'Aprobado, insertando', variant: 'outline' },
  INSERTED: { label: 'Insertado', variant: 'default' },
  INSERTION_FAILED: { label: 'Reintentando inserción', variant: 'destructive' },
};

export function batchStatusLabel(status: BatchStatus): string {
  return STATUS[status].label;
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const { label, variant } = STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
