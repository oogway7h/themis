import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { ApiError } from '@/api/client';
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
  electionFormSchema,
  type ElectionFormValues,
} from '../schemas/election-form.schema';
import { useCreateElection } from '../hooks/use-create-election';
import { useUpdateElection } from '../hooks/use-update-election';
import { DateTimeField } from './DateTimeField';
import type { ElectionDto } from '../types/election.types';

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toIso(local: string): string {
  return new Date(local).toISOString();
}

function mutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'Revisa las fechas y las opciones: hay un dato incoherente.';
    }
    if (error.status === 409) {
      return 'La elección ya no está en Borrador, no se puede modificar.';
    }
    if (error.status === 403) {
      return 'No tienes permiso para realizar esta acción.';
    }
  }
  return 'No se pudo guardar. Intenta de nuevo.';
}

export interface ElectionFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  election?: ElectionDto | null;
}

export function ElectionFormDrawer({
  open,
  onOpenChange,
  mode,
  election,
}: ElectionFormDrawerProps) {
  // Nodo real del Drawer, para portar los Popover de DateTimeField dentro de
  // él (ver DateTimeField.tsx) en vez de document.body — si no, vaul cierra
  // el Drawer al interpretar el clic en el calendario como "afuera".
  const [drawerContentEl, setDrawerContentEl] = useState<HTMLDivElement | null>(null);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent ref={setDrawerContentEl} className="px-4 pb-4 sm:max-w-2xl">
        {mode === 'create' ? (
          <ElectionForm onDone={() => onOpenChange(false)} portalContainer={drawerContentEl} />
        ) : election ? (
          <ElectionForm
            key={election.id}
            election={election}
            onDone={() => onOpenChange(false)}
            portalContainer={drawerContentEl}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function ElectionForm({
  election,
  onDone,
  portalContainer,
}: {
  election?: ElectionDto;
  onDone: () => void;
  portalContainer: HTMLDivElement | null;
}) {
  const createElection = useCreateElection();
  const updateElection = useUpdateElection();
  const isEdit = !!election;
  const mutation = isEdit ? updateElection : createElection;

  const form = useForm<ElectionFormValues>({
    resolver: zodResolver(electionFormSchema),
    defaultValues: election
      ? {
          nombre: election.nombre,
          descripcion: election.descripcion ?? '',
          registroInicio: toDatetimeLocal(election.registroInicio),
          registroFin: toDatetimeLocal(election.registroFin),
          votacionInicio: toDatetimeLocal(election.votacionInicio),
          votacionFin: toDatetimeLocal(election.votacionFin),
          opciones: election.opciones.map((option) => ({
            nombre: option.nombre,
            descripcion: option.descripcion ?? '',
          })),
        }
      : {
          nombre: '',
          descripcion: '',
          registroInicio: '',
          registroFin: '',
          votacionInicio: '',
          votacionFin: '',
          opciones: [{ nombre: '' }, { nombre: '' }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'opciones',
  });

  function onSubmit(values: ElectionFormValues) {
    const payload = {
      nombre: values.nombre,
      descripcion: values.descripcion,
      registroInicio: toIso(values.registroInicio),
      registroFin: toIso(values.registroFin),
      votacionInicio: toIso(values.votacionInicio),
      votacionFin: toIso(values.votacionFin),
      opciones: values.opciones,
    };

    if (isEdit && election) {
      updateElection.mutate(
        { id: election.id, values: payload },
        { onSuccess: () => onDone() },
      );
    } else {
      createElection.mutate(payload, {
        onSuccess: () => {
          form.reset();
          onDone();
        },
      });
    }
  }

  const editableLocked = isEdit && election?.estado !== 'BORRADOR';

  return (
    <>
      <DrawerHeader className="px-0">
        <DrawerTitle>{isEdit ? 'Editar elección' : 'Nueva elección'}</DrawerTitle>
        <DrawerDescription>
          {isEdit
            ? editableLocked
              ? 'Esta elección ya no está en Borrador: solo lectura.'
              : 'Solo se puede editar mientras esté en Borrador.'
            : 'Mecanismo SEMAPHORE y umbral de firmas 3 se fijan automáticamente.'}
        </DrawerDescription>
      </DrawerHeader>

      <form
        className="max-h-[75vh] space-y-4 overflow-y-auto"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            disabled={editableLocked}
            aria-invalid={!!form.formState.errors.nombre}
            {...form.register('nombre')}
          />
          {form.formState.errors.nombre ? (
            <p className="text-sm text-destructive">{form.formState.errors.nombre.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Input id="descripcion" disabled={editableLocked} {...form.register('descripcion')} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="registroInicio">Inicio de registro</Label>
            <Controller
              control={form.control}
              name="registroInicio"
              render={({ field }) => (
                <DateTimeField
                  portalContainer={portalContainer}
                  id="registroInicio"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={editableLocked}
                  invalid={!!form.formState.errors.registroInicio}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registroFin">Cierre de registro</Label>
            <Controller
              control={form.control}
              name="registroFin"
              render={({ field }) => (
                <DateTimeField
                  portalContainer={portalContainer}
                  id="registroFin"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={editableLocked}
                  invalid={!!form.formState.errors.registroFin}
                />
              )}
            />
            {form.formState.errors.registroFin ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.registroFin.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="votacionInicio">Inicio de votación</Label>
            <Controller
              control={form.control}
              name="votacionInicio"
              render={({ field }) => (
                <DateTimeField
                  portalContainer={portalContainer}
                  id="votacionInicio"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={editableLocked}
                  invalid={!!form.formState.errors.votacionInicio}
                />
              )}
            />
            {form.formState.errors.votacionInicio ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.votacionInicio.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="votacionFin">Cierre de votación</Label>
            <Controller
              control={form.control}
              name="votacionFin"
              render={({ field }) => (
                <DateTimeField
                  portalContainer={portalContainer}
                  id="votacionFin"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={editableLocked}
                  invalid={!!form.formState.errors.votacionFin}
                />
              )}
            />
            {form.formState.errors.votacionFin ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.votacionFin.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Opciones / candidaturas</Label>
            {!editableLocked ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ nombre: '' })}
              >
                <Plus className="size-4" />
                Agregar
              </Button>
            ) : null}
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <Input
                placeholder={`Opción ${index + 1}`}
                disabled={editableLocked}
                aria-invalid={!!form.formState.errors.opciones?.[index]?.nombre}
                {...form.register(`opciones.${index}.nombre` as const)}
              />
              {!editableLocked && fields.length > 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar opción"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
          {form.formState.errors.opciones?.message ? (
            <p className="text-sm text-destructive">{form.formState.errors.opciones.message}</p>
          ) : null}
        </div>

        {isEdit && election ? (
          <p className="text-xs text-muted-foreground">
            Mecanismo: {election.mecanismoCriptografico} · Umbral de firmas:{' '}
            {election.umbralFirmas}
          </p>
        ) : null}

        {mutation.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {mutationErrorMessage(mutation.error)}
          </p>
        ) : null}

        <DrawerFooter className="px-0">
          {!editableLocked ? (
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear elección'}
            </Button>
          ) : null}
          <DrawerClose asChild>
            <Button type="button" variant="outline">
              {editableLocked ? 'Cerrar' : 'Cancelar'}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </form>
    </>
  );
}
