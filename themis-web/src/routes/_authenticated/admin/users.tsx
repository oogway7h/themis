import { createFileRoute } from '@tanstack/react-router';
import { requireSuperUsuario } from '@/features/auth/lib/role-guards';
import { UsersPage } from '@/features/users/pages/UsersPage';

export const Route = createFileRoute('/_authenticated/admin/users')({
  beforeLoad: ({ context }) => requireSuperUsuario(context.auth),
  component: UsersPage,
});
