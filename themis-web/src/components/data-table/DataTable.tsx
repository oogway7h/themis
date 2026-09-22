import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { buildActionsColumn, buildIndexColumn, type RowActionsConfig } from './columns';

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  /** 0-based, a diferencia de la página que ve el usuario (1-based). */
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  isLoading?: boolean;
  /** Columna "Nro" (1..N) al inicio de la tabla. Default: true. */
  showRowNumber?: boolean;
  /** Columna "Acciones" al final -- se omite si no se pasa ninguna acción. */
  rowActions?: RowActionsConfig<TData>;
  emptyMessage?: string;
}

export function DataTable<TData>({
  columns,
  data,
  pageIndex,
  pageSize,
  pageCount,
  onPageChange,
  isLoading = false,
  showRowNumber = true,
  rowActions,
  emptyMessage = 'Sin resultados.',
}: DataTableProps<TData>) {
  const allColumns: ColumnDef<TData, any>[] = [
    ...(showRowNumber ? [buildIndexColumn<TData>(pageIndex, pageSize)] : []),
    ...columns,
    ...(rowActions ? [buildActionsColumn<TData>(rowActions)] : []),
  ];

  const table = useReactTable({
    data,
    columns: allColumns,
    pageCount,
    manualPagination: true,
    state: { pagination: { pageIndex, pageSize } },
    getCoreRowModel: getCoreRowModel(),
  });

  const canGoPrevious = pageIndex > 0;
  const canGoNext = pageIndex + 1 < pageCount;

  return (
    <div className="flex max-h-full flex-col gap-4">
      <div className="min-h-0 overflow-auto rounded-xl border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {allColumns.map((column, colIndex) => (
                    <TableCell key={column.id ?? colIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={allColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">
          Página {pageIndex + 1} de {Math.max(pageCount, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={!canGoPrevious}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={!canGoNext}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
