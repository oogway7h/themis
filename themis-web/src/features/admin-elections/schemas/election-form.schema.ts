import { z } from 'zod';

const optionSchema = z.object({
  nombre: z.string().min(1, 'El nombre de la opción es obligatorio'),
  descripcion: z.string().optional(),
});

export const electionFormSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    descripcion: z.string().optional(),
    registroInicio: z.string().min(1, 'Requerido'),
    registroFin: z.string().min(1, 'Requerido'),
    votacionInicio: z.string().min(1, 'Requerido'),
    votacionFin: z.string().min(1, 'Requerido'),
    opciones: z.array(optionSchema).min(2, 'Se requieren al menos 2 opciones'),
  })
  .refine((data) => new Date(data.registroFin) > new Date(data.registroInicio), {
    message: 'El cierre de registro debe ser posterior a su inicio',
    path: ['registroFin'],
  })
  .refine((data) => new Date(data.votacionInicio) >= new Date(data.registroFin), {
    message: 'La votación debe comenzar en o después del cierre del registro',
    path: ['votacionInicio'],
  })
  .refine((data) => new Date(data.votacionFin) > new Date(data.votacionInicio), {
    message: 'El cierre de votación debe ser posterior a su inicio',
    path: ['votacionFin'],
  });

export type ElectionFormValues = z.infer<typeof electionFormSchema>;
