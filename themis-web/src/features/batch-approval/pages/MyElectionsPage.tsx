import * as React from 'react';
import { useFitPageSize } from '@/hooks/use-fit-page-size';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { ESTADO_LABELS } from '@/features/admin-elections/components/ElectionsDataTable';
import type { ElectionDto } from '@/features/admin-elections/types/election.types';
import { useMyAuthorityElections } from '../hooks/use-my-authority-elections';

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
];

/** Elecciones donde la cuenta esta designada como autoridad: punto de entrada a los lotes. */
export function MyElectionsPage() {
  const navigate = useNavigate();
  const [pageIndex, setPageIndex] = React.useState(0);
  const { ref: tableRef, pageSize } = useFitPageSize();
  const electionsQuery = useMyAuthorityElections();

  const all = electionsQuery.data ?? [];
  const data = all.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));

  React.useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div>
        <h1 className="page-title">Mis elecciones</h1>
        <p className="text-sm text-muted-foreground">
          Elecciones en las que estás designado como autoridad de registro. Entra a una para
          revisar y aprobar sus lotes.
        </p>
      </div>

      {electionsQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          No se pudieron cargar tus elecciones.
        </p>
      ) : null}

      <div ref={tableRef} className="min-h-0 flex-1">
      <DataTable
        columns={columns}
        data={data}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPageChange={setPageIndex}
        isLoading={electionsQuery.isLoading}
        rowActions={{
          onView: (election) =>
            navigate({
              to: '/elections/$electionId/batches',
              params: { electionId: election.id },
            }),
        }}
        emptyMessage="No estás designado como autoridad en ninguna elección."
      />
      </div>
    </div>
  );
}
