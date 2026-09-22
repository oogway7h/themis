import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import type { ElectionDto } from '../types/election.types';

export const ESTADO_LABELS: Record<ElectionDto['estado'], string> = {
  BORRADOR: 'Borrador',
  REGISTRO_ABIERTO: 'Registro abierto',
  REGISTRO_CERRADO: 'Registro cerrado',
  VOTACION_ABIERTA: 'Votación abierta',
  CERRADA: 'Cerrada',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const columns: ColumnDef<ElectionDto>[] = [
  { accessorKey: 'nombre', header: 'Nombre' },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => ESTADO_LABELS[row.original.estado],
  },
  {
    id: 'registro',
    header: 'Registro',
    cell: ({ row }) =>
      `${formatDate(row.original.registroInicio)} — ${formatDate(row.original.registroFin)}`,
  },
  {
    id: 'votacion',
    header: 'Votación',
    cell: ({ row }) =>
      `${formatDate(row.original.votacionInicio)} — ${formatDate(row.original.votacionFin)}`,
  },
  {
    id: 'opciones',
    header: 'Opciones',
    cell: ({ row }) => row.original.opciones.length,
  },
];

export interface ElectionsDataTableProps {
  data: ElectionDto[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  isLoading?: boolean;
  onView: (election: ElectionDto) => void;
  onEdit: (election: ElectionDto) => void;
  onDelete: (election: ElectionDto) => void;
}

export function ElectionsDataTable({
  data,
  pageIndex,
  pageSize,
  pageCount,
  onPageChange,
  isLoading,
  onView,
  onEdit,
  onDelete,
}: ElectionsDataTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageCount={pageCount}
      onPageChange={onPageChange}
      isLoading={isLoading}
      rowActions={{ onView, onEdit, onDelete }}
      emptyMessage="No hay elecciones creadas."
    />
  );
}
