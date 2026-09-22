import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormValues,
  type UpdateUserFormValues,
} from '../schemas/user-form.schema';
import { useCreateUser } from '../hooks/use-create-user';
import { useUpdateUser } from '../hooks/use-update-user';
import type { PlatformUserDto } from '../types/user.types';

// Select nativo: son solo 3 opciones fijas, no amerita instalar el Select de
// shadcn/Radix. forwardRef es obligatorio para que react-hook-form pueda
// leer su valor (mismo patron que el resto de los formularios del portal).
const RoleSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    data-slot="select"
    className={cn(
      'border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
      className,
    )}
    {...props}
  >
    <option value="">Selecciona un rol</option>
    <option value="ADMIN">Administrador</option>
    <option value="AUTORIDAD_REGISTRO">Autoridad de Registro</option>
    <option value="AUDITOR">Auditor</option>
  </select>
));
RoleSelect.displayName = 'RoleSelect';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return 'Ya existe una cuenta con ese email.';
    }
    if (error.status === 403) {
      return 'No tienes permiso para realizar esta accion.';
    }
    if (error.status === 404) {
      return 'La cuenta ya no existe o fue desactivada.';
    }
  }
  return 'No se pudo guardar. Intenta de nuevo.';
}

export interface UserFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  /** Requerido cuando mode === 'edit'; ignorado en modo create. */
  user?: PlatformUserDto | null;
}

/**
 * Un solo Drawer para crear y editar: en 'create' pide email/password/rol;
 * en 'edit' solo nombreCompleto/rol (no reabre email/password por esta via).
 */
export function UserFormDrawer({ open, onOpenChange, mode, user }: UserFormDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="px-4 pb-4 sm:max-w-md">
        {mode === 'create' ? (
          <CreateUserForm onDone={() => onOpenChange(false)} />
        ) : user ? (
          <EditUserForm key={user.id} user={user} onDone={() => onOpenChange(false)} />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const createUser = useCreateUser();
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', password: '', nombreCompleto: '', role: undefined },
  });

  function onSubmit(values: CreateUserFormValues) {
    createUser.mutate(values, {
      onSuccess: () => {
        form.reset();
        onDone();
      },
    });
  }

  return (
    <>
      <DrawerHeader className="px-0">
        <DrawerTitle>Nueva cuenta</DrawerTitle>
        <DrawerDescription>Administrador, Autoridad de Registro o Auditor</DrawerDescription>
      </DrawerHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="nombreCompleto">Nombre completo</Label>
          <Input
            id="nombreCompleto"
            autoComplete="name"
            aria-invalid={!!form.formState.errors.nombreCompleto}
            {...form.register('nombreCompleto')}
          />
          {form.formState.errors.nombreCompleto ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.nombreCompleto.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="off"
            placeholder="nueva.autoridad@themis.dev"
            aria-invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contrasena</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!form.formState.errors.password}
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Rol</Label>
          <RoleSelect
            id="role"
            aria-invalid={!!form.formState.errors.role}
            {...form.register('role')}
          />
          {form.formState.errors.role ? (
            <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
          ) : null}
        </div>

        {createUser.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {mutationErrorMessage(createUser.error)}
          </p>
        ) : null}

        <DrawerFooter className="px-0">
          <Button type="submit" disabled={createUser.isPending}>
            {createUser.isPending ? 'Creando...' : 'Crear cuenta'}
          </Button>
          <DrawerClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </form>
    </>
  );
}

function EditUserForm({ user, onDone }: { user: PlatformUserDto; onDone: () => void }) {
  const updateUser = useUpdateUser();
  const form = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { nombreCompleto: user.nombreCompleto, role: user.role },
  });

  function onSubmit(values: UpdateUserFormValues) {
    updateUser.mutate(
      { id: user.id, values },
      { onSuccess: () => onDone() },
    );
  }

  return (
    <>
      <DrawerHeader className="px-0">
        <DrawerTitle>Editar cuenta</DrawerTitle>
        <DrawerDescription>{user.email}</DrawerDescription>
      </DrawerHeader>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="edit-nombreCompleto">Nombre completo</Label>
          <Input
            id="edit-nombreCompleto"
            autoComplete="name"
            aria-invalid={!!form.formState.errors.nombreCompleto}
            {...form.register('nombreCompleto')}
          />
          {form.formState.errors.nombreCompleto ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.nombreCompleto.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-role">Rol</Label>
          <RoleSelect
            id="edit-role"
            aria-invalid={!!form.formState.errors.role}
            {...form.register('role')}
          />
          {form.formState.errors.role ? (
            <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
          ) : null}
        </div>

        {updateUser.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {mutationErrorMessage(updateUser.error)}
          </p>
        ) : null}

        <DrawerFooter className="px-0">
          <Button type="submit" disabled={updateUser.isPending}>
            {updateUser.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          <DrawerClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </form>
    </>
  );
}
