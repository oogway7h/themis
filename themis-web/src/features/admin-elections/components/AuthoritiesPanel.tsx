import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  designateAuthoritiesSchema,
  replaceAuthoritySchema,
  type DesignateAuthoritiesFormValues,
  type ReplaceAuthorityFormValues,
} from '../schemas/authority.schema';
import { useAuthorities } from '../hooks/use-authorities';
import { useDesignateAuthorities } from '../hooks/use-designate-authorities';
import { useReplaceAuthority } from '../hooks/use-replace-authority';
import { PlatformUserCombobox } from './PlatformUserCombobox';
import type { AuthorityDto } from '../types/authority.types';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'Revisa que sean exactamente 5 cuentas distintas, activas y con rol Autoridad de Registro.';
    }
    if (error.status === 404) {
      return 'Alguna cuenta seleccionada ya no existe.';
    }
    if (error.status === 409) {
      return 'Alguna cuenta ya está designada, o la elección está cerrada.';
    }
  }
  return 'No se pudo guardar. Intenta de nuevo.';
}

export interface AuthoritiesPanelProps {
  electionId: string;
  electionEstado: 'BORRADOR' | 'REGISTRO_ABIERTO' | 'REGISTRO_CERRADO' | 'VOTACION_ABIERTA' | 'CERRADA';
}

export function AuthoritiesPanel({ electionId, electionEstado }: AuthoritiesPanelProps) {
  const authoritiesQuery = useAuthorities(electionId);
  const authorities = authoritiesQuery.data ?? [];
  const closed = electionEstado === 'CERRADA';
  const [replacing, setReplacing] = React.useState<AuthorityDto | null>(null);

  if (authoritiesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autoridades de registro</CardTitle>
        <CardDescription>
          Identificadas solo por rol descriptivo — el email es visible únicamente en esta
          pantalla de administración.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {authorities.length === 0 ? (
          <DesignateAuthoritiesForm electionId={electionId} disabled={closed} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol descriptivo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authorities.map((authority) => (
                <TableRow key={authority.id}>
                  <TableCell>{authority.rolDescriptivo}</TableCell>
                  <TableCell>{authority.platformUserEmail}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={closed}
                      onClick={() => setReplacing(authority)}
                    >
                      Reemplazar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ReplaceAuthorityDrawer
        electionId={electionId}
        authority={replacing}
        allAuthorities={authorities}
        open={replacing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReplacing(null);
          }
        }}
      />
    </Card>
  );
}

function DesignateAuthoritiesForm({
  electionId,
  disabled,
}: {
  electionId: string;
  disabled: boolean;
}) {
  const designateAuthorities = useDesignateAuthorities(electionId);
  const form = useForm<DesignateAuthoritiesFormValues>({
    resolver: zodResolver(designateAuthoritiesSchema),
    defaultValues: {
      autoridades: Array.from({ length: 5 }, () => ({
        platformUserId: '',
        platformUserEmail: '',
        rolDescriptivo: '',
      })),
    },
  });
  const { fields } = useFieldArray({ control: form.control, name: 'autoridades' });
  const currentValues = form.watch('autoridades');

  function onSubmit(values: DesignateAuthoritiesFormValues) {
    designateAuthorities.mutate(
      values.autoridades.map((a) => ({
        platformUserId: a.platformUserId,
        rolDescriptivo: a.rolDescriptivo,
      })),
    );
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Cuenta {index + 1}</Label>
            <Controller
              control={form.control}
              name={`autoridades.${index}`}
              render={({ field: controllerField }) => (
                <PlatformUserCombobox
                  disabled={disabled}
                  value={
                    controllerField.value.platformUserId
                      ? {
                          platformUserId: controllerField.value.platformUserId,
                          platformUserEmail: controllerField.value.platformUserEmail,
                        }
                      : null
                  }
                  onChange={(selection) =>
                    controllerField.onChange({ ...controllerField.value, ...selection })
                  }
                  excludeEmails={currentValues
                    .filter((_, otherIndex) => otherIndex !== index)
                    .map((slot) => slot.platformUserEmail)
                    .filter(Boolean)}
                />
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`rol-${index}`}>Rol descriptivo</Label>
            <Input
              id={`rol-${index}`}
              placeholder="Ej. Profesor titular"
              disabled={disabled}
              {...form.register(`autoridades.${index}.rolDescriptivo` as const)}
            />
          </div>
        </div>
      ))}

      {form.formState.errors.autoridades?.message ? (
        <p className="text-sm text-destructive">{form.formState.errors.autoridades.message}</p>
      ) : null}
      {designateAuthorities.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {mutationErrorMessage(designateAuthorities.error)}
        </p>
      ) : null}

      {!disabled ? (
        <Button type="submit" disabled={designateAuthorities.isPending}>
          {designateAuthorities.isPending ? 'Designando...' : 'Designar las 5 autoridades'}
        </Button>
      ) : null}
    </form>
  );
}

function ReplaceAuthorityDrawer({
  electionId,
  authority,
  allAuthorities,
  open,
  onOpenChange,
}: {
  electionId: string;
  authority: AuthorityDto | null;
  allAuthorities: AuthorityDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Nodo real del Drawer, para portar el Popover del combobox dentro de él en
  // vez de document.body — si no, vaul cierra el Drawer al interpretar el
  // clic en la lista como "afuera" (ver components/ui/popover.tsx).
  const [drawerContentEl, setDrawerContentEl] = React.useState<HTMLDivElement | null>(null);
  const excludeEmails = allAuthorities
    .filter((other) => other.id !== authority?.id)
    .map((other) => other.platformUserEmail);

  const replaceAuthority = useReplaceAuthority(electionId);
  const form = useForm<ReplaceAuthorityFormValues>({
    resolver: zodResolver(replaceAuthoritySchema),
    values: authority
      ? {
          platformUserId: '',
          platformUserEmail: authority.platformUserEmail,
          rolDescriptivo: authority.rolDescriptivo,
        }
      : undefined,
  });

  function onSubmit(values: ReplaceAuthorityFormValues) {
    if (!authority) {
      return;
    }
    replaceAuthority.mutate(
      {
        authorityId: authority.id,
        values: { platformUserId: values.platformUserId, rolDescriptivo: values.rolDescriptivo },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent ref={setDrawerContentEl} className="px-4 pb-4 sm:max-w-md">
        {authority ? (
          <>
            <DrawerHeader className="px-0">
              <DrawerTitle>Reemplazar autoridad</DrawerTitle>
              <DrawerDescription>Cuenta actual: {authority.platformUserEmail}</DrawerDescription>
            </DrawerHeader>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <div className="space-y-1">
                <Label>Nueva cuenta</Label>
                <Controller
                  control={form.control}
                  name="platformUserId"
                  render={({ field }) => (
                    <PlatformUserCombobox
                      value={
                        field.value
                          ? {
                              platformUserId: field.value,
                              platformUserEmail: form.getValues('platformUserEmail'),
                            }
                          : null
                      }
                      onChange={(selection) => {
                        field.onChange(selection.platformUserId);
                        form.setValue('platformUserEmail', selection.platformUserEmail);
                      }}
                      excludeEmails={excludeEmails}
                      portalContainer={drawerContentEl}
                    />
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="replace-rol">Rol descriptivo</Label>
                <Input id="replace-rol" {...form.register('rolDescriptivo')} />
              </div>

              {replaceAuthority.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  {mutationErrorMessage(replaceAuthority.error)}
                </p>
              ) : null}

              <DrawerFooter className="px-0">
                <Button type="submit" disabled={replaceAuthority.isPending}>
                  {replaceAuthority.isPending ? 'Guardando...' : 'Reemplazar'}
                </Button>
                <DrawerClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
