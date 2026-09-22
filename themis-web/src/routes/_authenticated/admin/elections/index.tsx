import { createFileRoute } from '@tanstack/react-router';
import { requireAdmin } from '@/features/auth/lib/role-guards';
import { ElectionsPage } from '@/features/admin-elections/pages/ElectionsPage';

export const Route = createFileRoute('/_authenticated/admin/elections/')({
  beforeLoad: ({ context }) => requireAdmin(context.auth),
  component: ElectionsPage,
});
