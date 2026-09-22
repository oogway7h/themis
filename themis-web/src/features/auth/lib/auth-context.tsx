import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from '@/api/client';
import type { LoginResponse, MeResponse } from '../types/auth.types';

export interface AuthSession {
  role: LoginResponse['role'];
  nombreCompleto: string;
}

export type AuthStatus = 'pending' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  login: (session: AuthSession) => void;
  logout: () => Promise<void>;
  /**
   * Lee la sesion actual de forma sincrona, sin pasar por el ciclo de
   * render de React. El `beforeLoad` de TanStack Router se ejecuta antes
   * de que un `setState` de React (async/por lotes) llegue a este
   * contexto — por ejemplo, justo despues de `login()`, cuando el mismo
   * callback ya llama a `navigate()`. `session` (el campo de arriba)
   * sirve para pintar la UI; esta funcion es la que debe usar cualquier
   * guardia de ruta.
   */
  getSession: () => AuthSession | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('pending');
  const [session, setSession] = useState<AuthSession | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    // La sesion vive en la cookie httpOnly access_token: el JS del cliente
    // no puede leerla, asi que al montar preguntamos a themis-core "quien
    // soy" para saber si ya hay una sesion activa (por ejemplo, tras un F5).
    api
      .get<MeResponse>('/auth/me')
      .then((me) => {
        if (cancelled) return;
        const nextSession = { role: me.role, nombreCompleto: me.nombreCompleto };
        sessionRef.current = nextSession;
        setSession(nextSession);
        setStatus('authenticated');
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setStatus('anonymous');
          return;
        }
        // Backend inalcanzable u otro error: no hay forma de confirmar
        // sesion, tratamos como anonimo en vez de dejar la app colgada.
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getSession = useCallback(() => sessionRef.current, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      getSession,
      login: (newSession: AuthSession) => {
        sessionRef.current = newSession;
        setSession(newSession);
        setStatus('authenticated');
      },
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } finally {
          sessionRef.current = null;
          setSession(null);
          setStatus('anonymous');
        }
      },
    }),
    [status, session, getSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
