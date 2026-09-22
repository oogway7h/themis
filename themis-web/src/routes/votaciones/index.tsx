import { createFileRoute } from '@tanstack/react-router';
import { VotacionesListPage } from '@/features/votaciones/pages/VotacionesListPage';

// Publica (fuera de _authenticated): CU-11 no requiere sesion ni identidad.
export const Route = createFileRoute('/votaciones/')({
  component: VotacionesListPage,
});
