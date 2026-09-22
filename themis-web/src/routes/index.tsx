import { createFileRoute } from '@tanstack/react-router';
import { VotacionesListPage } from '@/features/votaciones/pages/VotacionesListPage';

// CU-11: landing publica (sin auth) -- lo primero que ve cualquiera al
// entrar es el conteo de votaciones en vivo. Admin/Autoridad/Auditor siguen
// entrando por /login (no linkeado desde aca a proposito, ver CLAUDE.md).
export const Route = createFileRoute('/')({
  component: VotacionesListPage,
});
