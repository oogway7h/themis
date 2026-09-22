import { z } from 'zod';

const authoritySlotSchema = z.object({
  platformUserId: z.string().min(1, 'Selecciona una cuenta'),
  platformUserEmail: z.string().min(1),
  rolDescriptivo: z.string().min(1, 'El rol descriptivo es obligatorio'),
});

export const designateAuthoritiesSchema = z
  .object({ autoridades: z.array(authoritySlotSchema).length(5) })
  .refine(
    (data) => new Set(data.autoridades.map((a) => a.platformUserId)).size === 5,
    { message: 'No puedes repetir la misma cuenta en dos filas', path: ['autoridades'] },
  );

export type DesignateAuthoritiesFormValues = z.infer<typeof designateAuthoritiesSchema>;

export const replaceAuthoritySchema = z.object({
  platformUserId: z.string().min(1, 'Selecciona una cuenta'),
  platformUserEmail: z.string().min(1),
  rolDescriptivo: z.string().min(1, 'El rol descriptivo es obligatorio'),
});

export type ReplaceAuthorityFormValues = z.infer<typeof replaceAuthoritySchema>;
