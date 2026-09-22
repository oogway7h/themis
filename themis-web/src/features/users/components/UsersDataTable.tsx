import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { ROLE_LABELS } from '@/features/auth/lib/role-labels';
import type { PlatformUserDto } from '../types/user.types';

const columns: ColumnDef<PlatformUserDto>[] = [
  { accessorKey: 'nombreCompleto', header: 'Nombre' },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'role',
    header: 'Rol',
    cell: ({ row }) => ROLE_LABELS[row.original.role],
  },
];

export interface UsersDataTableProps {
  data: PlatformUserDto[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  isLoading?: boolean;
  onEdit: (user: PlatformUserDto) => void;
  onDelete: (user: PlatformUserDto) => void;
}

export function UsersDataTable({
  data,
  pageIndex,
  pageSize,
  pageCount,
  onPageChange,
  isLoading,
  onEdit,
  onDelete,
}: UsersDataTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageCount={pageCount}
      onPageChange={onPageChange}
      isLoading={isLoading}
      rowActions={{ onEdit, onDelete }}
      emptyMessage="No hay usuarios registrados."
    />
  );
}
