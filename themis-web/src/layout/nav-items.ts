import { ClipboardCheck, LayoutDashboard, ShieldCheck, Users, Vote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PlatformRole } from '@/features/auth/types/auth.types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: PlatformRole[];
}

const ALL_ROLES: PlatformRole[] = [
  'ADMIN',
  'AUTORIDAD_REGISTRO',
  'AUDITOR',
  'SUPERUSUARIO',
];

/**
 * Nav declarativa del sidebar: cada ítem lista los roles que pueden verlo.
 * `/demo` (andamiaje descartable, ver CLAUDE.md raíz) deliberadamente no
 * está acá — sigue existiendo como ruta, pero no se linkea desde ningún
 * lado.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ALL_ROLES },
  { label: 'Elecciones', to: '/admin/elections', icon: Vote, roles: ['ADMIN'] },
  {
    label: 'Mis elecciones',
    to: '/authority/elections',
    icon: ClipboardCheck,
    roles: ['AUTORIDAD_REGISTRO'],
  },
  { label: 'Usuarios', to: '/admin/users', icon: Users, roles: ['SUPERUSUARIO'] },
  {
    label: 'Auditoría',
    to: '/audit/elections',
    icon: ShieldCheck,
    roles: ['AUDITOR'],
  },
];
