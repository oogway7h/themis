import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/Card';
import lockupDark from '@/assets/brand/themis-lockup-dark.svg';
import logoLight from '@/assets/brand/themis-logo-light.svg';
import { loginSchema, type LoginFormValues } from '../schemas/login.schema';
import { useLogin } from '../hooks/use-login';

export function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(values: LoginFormValues) {
    login.mutate(values, {
      onSuccess: () => {
        void navigate({ to: '/dashboard' });
      },
    });
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
        <img src={lockupDark} alt="Themis - voto seguro" className="h-16 w-auto self-start" />
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Cada persona, un voto.
            <span className="block text-brand">Ninguna identidad expuesta.</span>
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            Portal administrativo del sistema de votación electrónica con
            pruebas de conocimiento cero. Registro verificable, voto anónimo y
            resultados auditables.
          </p>
        </div>
        <p className="text-xs text-slate-500">Elección piloto · Representante FICCT</p>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -bottom-32 size-96 rounded-full border-[36px] border-brand/10"
        />
      </aside>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <img src={logoLight} alt="Themis" className="mx-auto mb-8 h-12 w-auto lg:hidden" />
          <div className="mb-6 space-y-1">
            <h2 className="text-2xl font-semibold text-foreground">Iniciar sesion</h2>
            <p className="text-sm text-muted-foreground">
              Administrador, Autoridad de Registro o Auditor
            </p>
          </div>
          <Card className="gap-0 py-0 shadow-sm">
            <CardContent className="p-6">
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@themis.dev"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register('email')}
                />
                {form.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!form.formState.errors.password}
                  {...form.register('password')}
                />
                {form.formState.errors.password ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              {login.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  Credenciales invalidas. Verifica tu email y contrasena.
                </p>
              ) : null}

              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full"
                disabled={login.isPending}
              >
                {login.isPending ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Acceso restringido a personal autorizado.
          </p>
        </div>
      </section>
    </main>
  );
}
