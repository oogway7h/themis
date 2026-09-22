import { useForm } from 'react-hook-form';
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
import { rollConfigSchema, type RollConfigFormValues } from '../schemas/roll-config.schema';
import { useRollConfig } from '../hooks/use-roll-config';
import { useConfigureRoll } from '../hooks/use-configure-roll';
import type { CarreraSso } from '../types/roll-config.types';

const CARRERAS: { value: CarreraSso; label: string }[] = [
  { value: 'INGENIERIA_SISTEMAS', label: 'Ingeniería de Sistemas' },
  { value: 'INGENIERIA_INFORMATICA', label: 'Ingeniería Informática' },
  { value: 'INGENIERIA_REDES_TELECOMUNICACIONES', label: 'Ingeniería en Redes y Telecomunicaciones' },
  { value: 'INGENIERIA_ROBOTICA', label: 'Ingeniería Robótica' },
];

function mutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'Revisa la profundidad del árbol y los valores de elegibilidad.';
    }
    if (error.status === 409) {
      return 'El padrón queda fijo una vez abierto el registro.';
    }
  }
  return 'No se pudo guardar. Intenta de nuevo.';
}

export interface RollConfigFormProps {
  electionId: string;
  electionEstado: 'BORRADOR' | 'REGISTRO_ABIERTO' | 'REGISTRO_CERRADO' | 'VOTACION_ABIERTA' | 'CERRADA';
}

export function RollConfigForm({ electionId, electionEstado }: RollConfigFormProps) {
  const rollConfigQuery = useRollConfig(electionId);
  const configureRoll = useConfigureRoll(electionId);
  const locked = electionEstado !== 'BORRADOR';
  const current = rollConfigQuery.data;

  const form = useForm<RollConfigFormValues>({
    resolver: zodResolver(rollConfigSchema),
    values: current
      ? {
          profundidadArbol: String(current.profundidadArbol ?? 13),
          elegibilidadFacultad: current.elegibilidadFacultad ?? 'FICCT',
          elegibilidadCarreras: current.elegibilidadCarreras,
          elegibilidadTipoUsuario: current.elegibilidadTipoUsuario ?? 'ESTUDIANTE',
          elegibilidadEstadoAcademico: current.elegibilidadEstadoAcademico ?? 'ACTIVO',
        }
      : undefined,
  });

  const profundidad = form.watch('profundidadArbol');
  const carrerasSeleccionadas = form.watch('elegibilidadCarreras') ?? [];
  const profundidadNum = Number(profundidad);
  const capacidad = Number.isFinite(profundidadNum) && profundidadNum > 0 ? 2 ** profundidadNum : null;

  function onSubmit(values: RollConfigFormValues) {
    configureRoll.mutate({
      ...values,
      profundidadArbol: Number(values.profundidadArbol),
    });
  }

  if (rollConfigQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Padrón y árbol de Merkle</CardTitle>
        <CardDescription>
          {current?.padronConfiguradoEn
            ? `Configurado el ${new Date(current.padronConfiguradoEn).toLocaleString('es-BO')}`
            : 'Todavía no configurado.'}{' '}
          {locked ? '— El registro ya está abierto: solo lectura.' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="profundidadArbol">Profundidad del árbol (4 a 20)</Label>
            <Input
              id="profundidadArbol"
              type="number"
              min={4}
              max={20}
              disabled={locked}
              aria-invalid={!!form.formState.errors.profundidadArbol}
              {...form.register('profundidadArbol')}
            />
            {capacidad !== null ? (
              <p className="text-xs text-muted-foreground">
                Capacidad máxima: 2^{profundidadNum} = {capacidad.toLocaleString('es-BO')} hojas
              </p>
            ) : null}
            {form.formState.errors.profundidadArbol ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.profundidadArbol.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="elegibilidadFacultad">Facultad objetivo</Label>
            <select
              id="elegibilidadFacultad"
              disabled={locked}
              className="border-input h-9 w-full rounded-md border bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              {...form.register('elegibilidadFacultad')}
            >
              <option value="FICCT">FICCT</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Carreras habilitadas (vacío = todas las de la facultad)</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CARRERAS.map((carrera) => (
                <label key={carrera.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={carrerasSeleccionadas.includes(carrera.value)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...carrerasSeleccionadas, carrera.value]
                        : carrerasSeleccionadas.filter((c) => c !== carrera.value);
                      form.setValue('elegibilidadCarreras', next, { shouldDirty: true });
                    }}
                  />
                  {carrera.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="elegibilidadTipoUsuario">Tipo de usuario requerido</Label>
            <select
              id="elegibilidadTipoUsuario"
              disabled={locked}
              className="border-input h-9 w-full rounded-md border bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              {...form.register('elegibilidadTipoUsuario')}
            >
              <option value="ESTUDIANTE">Estudiante</option>
              <option value="DOCENTE">Docente</option>
              <option value="ADMINISTRATIVO">Administrativo</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="elegibilidadEstadoAcademico">Estado académico requerido</Label>
            <select
              id="elegibilidadEstadoAcademico"
              disabled={locked}
              className="border-input h-9 w-full rounded-md border bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              {...form.register('elegibilidadEstadoAcademico')}
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>

          {configureRoll.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {mutationErrorMessage(configureRoll.error)}
            </p>
          ) : null}

          {!locked ? (
            <Button type="submit" disabled={configureRoll.isPending}>
              {configureRoll.isPending ? 'Guardando...' : 'Guardar configuración de padrón'}
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
