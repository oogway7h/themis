import { Link } from '@tanstack/react-router';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { usePublicElections } from '@/features/votaciones/hooks/use-public-elections';

// CU-15: listado de elecciones para el Auditor. Reusa el mismo endpoint
// publico que CU-11 (GET /elections/public) -- antes de esto el Auditor no
// tenia forma de listar elecciones (GET /elections es ADMIN-only).
export function AuditElectionsListPage() {
  const electionsQuery = usePublicElections();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Elegí una elección para ver su historial de registro y resultado.
        </p>
      </div>

      {electionsQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          No se pudieron cargar las elecciones.
        </p>
      ) : null}

      <div className="space-y-3">
        {electionsQuery.data?.map((election) => (
          <Link
            key={election.id}
            to="/audit/elections/$electionId"
            params={{ electionId: election.id }}
            className="block"
          >
            <Card className="border-l-4 border-l-brand transition-all hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-md">
              <CardHeader>
                <CardTitle>{election.nombre}</CardTitle>
                <CardDescription>{election.estado}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
