import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFitPageSize } from '@/hooks/use-fit-page-size';
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
import { useUsers } from '../hooks/use-users';
import { useDeleteUser } from '../hooks/use-delete-user';
import { UsersDataTable } from '../components/UsersDataTable';
import { UserFormDrawer } from '../components/UserFormDrawer';
import type { PlatformUserDto } from '../types/user.types';

type DrawerState = { mode: 'create' } | { mode: 'edit'; user: PlatformUserDto } | null;

export function UsersPage() {
  const [pageIndex, setPageIndex] = React.useState(0);
  const { ref: tableRef, pageSize } = useFitPageSize();
  const usersQuery = useUsers({ page: pageIndex + 1, pageSize: pageSize });
  const deleteUser = useDeleteUser();

  const [drawer, setDrawer] = React.useState<DrawerState>(null);
  const [userToDelete, setUserToDelete] = React.useState<PlatformUserDto | null>(null);

  const data = usersQuery.data?.data ?? [];
  const total = usersQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  function handleConfirmDelete() {
    if (!userToDelete) {
      return;
    }
    deleteUser.mutate(userToDelete.id, {
      onSuccess: () => setUserToDelete(null),
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Gestionar Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Administradores, autoridades de registro y auditores del portal.
          </p>
        </div>
        <Button type="button" onClick={() => setDrawer({ mode: 'create' })}>
          <Plus className="size-4" />
          Crear
        </Button>
      </div>

      <div ref={tableRef} className="min-h-0 flex-1">
      <UsersDataTable
        data={data}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPageChange={setPageIndex}
        isLoading={usersQuery.isLoading}
        onEdit={(user) => setDrawer({ mode: 'edit', user })}
        onDelete={(user) => setUserToDelete(user)}
      />
      </div>

      <UserFormDrawer
        open={drawer !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDrawer(null);
          }
        }}
        mode={drawer?.mode ?? 'create'}
        user={drawer?.mode === 'edit' ? drawer.user : null}
      />

      <AlertDialog
        open={userToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setUserToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a desactivar la cuenta de{' '}
              <span className="font-medium">{userToDelete?.nombreCompleto}</span>. Ya no va a
              poder iniciar sesion; el historial de auditoria se conserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteUser.isError ? (
            <p className="text-sm text-destructive" role="alert">
              No se pudo eliminar la cuenta. Intenta de nuevo.
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleConfirmDelete();
              }}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
