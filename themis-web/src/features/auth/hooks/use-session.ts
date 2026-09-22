import { useContext } from 'react';
import { AuthContext } from '../lib/auth-context';

export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSession debe usarse dentro de <AuthProvider>');
  }
  return context;
}
