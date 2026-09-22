import { z } from 'zod';

const roleSchema = z.enum(['ADMIN', 'AUTORIDAD_REGISTRO', 'AUDITOR'], {
  message: 'Selecciona un rol valido',
});

export const createUserSchema = z.object({
  email: z.email('Ingresa un email valido'),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
  nombreCompleto: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(120, 'El nombre es demasiado largo'),
  role: roleSchema,
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

/** Igual que createUserSchema pero sin email/password -- editar no los toca. */
export const updateUserSchema = z.object({
  nombreCompleto: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(120, 'El nombre es demasiado largo'),
  role: roleSchema,
});

export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
