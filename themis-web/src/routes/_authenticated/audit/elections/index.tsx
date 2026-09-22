import { createFileRoute } from '@tanstack/react-router';
import { requireAuditor } from '@/features/auth/lib/role-guards';
import { AuditElectionsListPage } from '@/features/audit/pages/AuditElectionsListPage';

export const Route = createFileRoute('/_authenticated/audit/elections/')({
  beforeLoad: ({ context }) => requireAuditor(context.auth),
  component: AuditElectionsListPage,
});
