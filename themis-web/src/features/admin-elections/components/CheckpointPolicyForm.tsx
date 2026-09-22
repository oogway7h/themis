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
import {
  checkpointPolicySchema,
  type CheckpointPolicyFormValues,
} from '../schemas/checkpoint-policy.schema';
import { useCheckpointPolicy } from '../hooks/use-checkpoint-policy';
import { useConfigureCheckpointPolicy } from '../hooks/use-configure-checkpoint-policy';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'Revisa el intervalo (5 a 1440 minutos) y el umbral (1 a 10000).';
    }
    if (error.status === 409) {
      return 'La política queda fija una vez abierto el registro.';
    }
  }
  return 'No se pudo guardar. Intenta de nuevo.';
}

export interface CheckpointPolicyFormProps {
  electionId: string;
  electionEstado: 'BORRADOR' | 'REGISTRO_ABIERTO' | 'REGISTRO_CERRADO' | 'VOTACION_ABIERTA' | 'CERRADA';
}

export function CheckpointPolicyForm({ electionId, electionEstado }: CheckpointPolicyFormProps) {
  const policyQuery = useCheckpointPolicy(electionId);
  const configurePolicy = useConfigureCheckpointPolicy(electionId);
  const locked = electionEstado !== 'BORRADOR';
  const current = policyQuery.data;

  const form = useForm<CheckpointPolicyFormValues>({
    resolver: zodResolver(checkpointPolicySchema),
    values: current
      ? {
          checkpointIntervalMinutes: String(current.checkpointIntervalMinutes),
          rateLimitThresholdPerMinute: String(current.rateLimitThresholdPerMinute),
        }
      : undefined,
  });

  function onSubmit(values: CheckpointPolicyFormValues) {
    configurePolicy.mutate({
      checkpointIntervalMinutes: Number(values.checkpointIntervalMinutes),
      rateLimitThresholdPerMinute: Number(values.rateLimitThresholdPerMinute),
    });
  }

  if (policyQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Política de checkpoints y límite de tasa</CardTitle>
        <CardDescription>
          {current?.esValorPorDefecto
            ? 'Valor por defecto de sistema, todavía no configurado explícitamente.'
            : 'Configurado explícitamente.'}{' '}
          {locked ? '— El registro ya está abierto: solo lectura.' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="checkpointIntervalMinutes">
              Intervalo de cierre de checkpoint (minutos, 5 a 1440)
            </Label>
            <Input
              id="checkpointIntervalMinutes"
              type="number"
              min={5}
              max={1440}
              disabled={locked}
              aria-invalid={!!form.formState.errors.checkpointIntervalMinutes}
              {...form.register('checkpointIntervalMinutes')}
            />
            {form.formState.errors.checkpointIntervalMinutes ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.checkpointIntervalMinutes.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rateLimitThresholdPerMinute">
              Umbral de límite de tasa (solicitudes por minuto, 1 a 10000)
            </Label>
            <Input
              id="rateLimitThresholdPerMinute"
              type="number"
              min={1}
              max={10000}
              disabled={locked}
              aria-invalid={!!form.formState.errors.rateLimitThresholdPerMinute}
              {...form.register('rateLimitThresholdPerMinute')}
            />
            {form.formState.errors.rateLimitThresholdPerMinute ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.rateLimitThresholdPerMinute.message}
              </p>
            ) : null}
          </div>

          {configurePolicy.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {mutationErrorMessage(configurePolicy.error)}
            </p>
          ) : null}

          {!locked ? (
            <Button type="submit" disabled={configurePolicy.isPending}>
              {configurePolicy.isPending ? 'Guardando...' : 'Guardar política de checkpoints'}
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
