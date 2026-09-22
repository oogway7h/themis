import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useLogout } from '../hooks/use-logout';
import { useSession } from '../hooks/use-session';

export function LogoutButton() {
  const { session } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();

  if (!session) {
    return null;
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: '/login' });
      },
    });
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-muted-foreground">
        Conectado como <span className="font-medium">{session.nombreCompleto}</span> (
        {session.role})
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleLogout}
        disabled={logout.isPending}
      >
        {logout.isPending ? 'Saliendo...' : 'Cerrar sesion'}
      </Button>
    </div>
  );
}
