import { z } from 'zod';

const CARRERA_VALUES = [
  'INGENIERIA_SISTEMAS',
  'INGENIERIA_INFORMATICA',
  'INGENIERIA_REDES_TELECOMUNICACIONES',
  'INGENIERIA_ROBOTICA',
] as const;

// profundidadArbol viaja como string en el form (input numérico controlado por
// react-hook-form) y se convierte a number recién al armar el payload — evita el
// choque de tipos input/output de z.coerce con zodResolver.
export const rollConfigSchema = z.object({
  profundidadArbol: z
    .string()
    .min(1, 'Ingresa un número')
    .refine((value) => Number.isInteger(Number(value)), 'Debe ser un número entero')
    .refine(
      (value) => Number(value) >= 4 && Number(value) <= 20,
      'La profundidad debe estar entre 4 (16 hojas) y 20 (1.048.576 hojas)',
    ),
  elegibilidadFacultad: z.enum(['FICCT'], { message: 'Selecciona una facultad' }),
  elegibilidadCarreras: z.array(z.enum(CARRERA_VALUES)),
  elegibilidadTipoUsuario: z.enum(['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'], {
    message: 'Selecciona un tipo de usuario',
  }),
  elegibilidadEstadoAcademico: z.enum(['ACTIVO', 'INACTIVO'], {
    message: 'Selecciona un estado académico',
  }),
});

export type RollConfigFormValues = z.infer<typeof rollConfigSchema>;
