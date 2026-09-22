import { createFileRoute } from '@tanstack/react-router';
import { requireAutoridadRegistro } from '@/features/auth/lib/role-guards';
import { MyElectionsPage } from '@/features/batch-approval/pages/MyElectionsPage';

export const Route = createFileRoute('/_authenticated/authority/elections/')({
  beforeLoad: ({ context }) => requireAutoridadRegistro(context.auth),
  component: MyElectionsPage,
});
