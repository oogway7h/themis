import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Acciones opcionales de la columna "Acciones" -- la que no se pasa no
 * renderiza su botón (ver DataTable.tsx, showRowNumber/rowActions).
 */
export interface RowActionsConfig<TData> {
  onView?: (row: TData) => void;
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;
}

export const ROW_NUMBER_COLUMN_ID = '__row_number';
export const ROW_ACTIONS_COLUMN_ID = '__row_actions';

export function buildIndexColumn<TData>(
  pageIndex: number,
  pageSize: number,
): ColumnDef<TData> {
  return {
    id: ROW_NUMBER_COLUMN_ID,
    header: 'Nro',
    cell: ({ row }) => pageIndex * pageSize + row.index + 1,
    enableSorting: false,
    size: 56,
  };
}

export function buildActionsColumn<TData>(
  actions: RowActionsConfig<TData>,
): ColumnDef<TData> {
  return {
    id: ROW_ACTIONS_COLUMN_ID,
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        {actions.onView ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Ver detalle"
            onClick={() => actions.onView?.(row.original)}
          >
            <Eye className="size-4" />
          </Button>
        ) : null}
        {actions.onEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Editar"
            onClick={() => actions.onEdit?.(row.original)}
          >
            <Pencil className="size-4" />
          </Button>
        ) : null}
        {actions.onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Eliminar"
            onClick={() => actions.onDelete?.(row.original)}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    ),
    enableSorting: false,
    size: 120,
  };
}
