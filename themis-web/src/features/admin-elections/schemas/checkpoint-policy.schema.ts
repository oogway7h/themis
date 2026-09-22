import { z } from 'zod';

// Ambos campos viajan como string en el form y se convierten a number recién al
// armar el payload — evita el choque de tipos input/output de z.coerce con
// zodResolver (mismo criterio que roll-config.schema.ts).
export const checkpointPolicySchema = z.object({
  checkpointIntervalMinutes: z
    .string()
    .min(1, 'Ingresa un número')
    .refine((value) => Number.isInteger(Number(value)), 'Debe ser un número entero')
    .refine(
      (value) => Number(value) >= 1 && Number(value) <= 1440,
      'El intervalo debe estar entre 1 y 1440 minutos',
    ),
  rateLimitThresholdPerMinute: z
    .string()
    .min(1, 'Ingresa un número')
    .refine((value) => Number.isInteger(Number(value)), 'Debe ser un número entero')
    .refine(
      (value) => Number(value) >= 1 && Number(value) <= 10000,
      'El umbral debe estar entre 1 y 10000 solicitudes por minuto',
    ),
});

export type CheckpointPolicyFormValues = z.infer<typeof checkpointPolicySchema>;
