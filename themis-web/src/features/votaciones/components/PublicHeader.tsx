import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AiForecastModal } from '@/features/ai-forecast/components/AiForecastModal';

// Header de las paginas publicas de CU-11 (landing "/", "/votaciones" y su
// detalle) -- sin sesion, con acceso a /login para Admin/Autoridad/Auditor.
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/70 px-6 py-4 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-brand">
          <Check className="size-4 text-white" strokeWidth={2.75} />
        </span>
        <span className="text-[19px] font-bold tracking-tight text-foreground">Themis</span>
      </Link>
      
      <div className="flex items-center gap-3">
        <AiForecastModal />
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/login">Iniciar sesión</Link>
        </Button>
      </div>
    </header>
  );
}
