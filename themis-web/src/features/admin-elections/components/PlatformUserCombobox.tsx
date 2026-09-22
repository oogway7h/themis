import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePlatformUsersByRole } from '../hooks/use-platform-users-by-role';

export interface PlatformUserComboboxProps {
  value: { platformUserId: string; platformUserEmail: string } | null;
  onChange: (selection: { platformUserId: string; platformUserEmail: string }) => void;
  disabled?: boolean;
  /**
   * Emails ya elegidos en otras filas/autoridades de esta misma elección —
   * una cuenta no puede ser más de una autoridad en la misma elección
   * (AC-02, HU-03), así que no deben listarse acá como opción.
   */
  excludeEmails?: string[];
  /**
   * Nodo del Drawer donde portar el Popover — si este campo vive dentro de un
   * Drawer (vaul), hay que pasarlo o el clic en la lista cierra el Drawer
   * entero (ver comentario en components/ui/popover.tsx).
   */
  portalContainer?: HTMLElement | null;
}

/**
 * Combobox único (Popover + Command de shadcn/ui): busca y selecciona en el
 * mismo control, sobre las cuentas AUTORIDAD_REGISTRO ya registradas en el
 * sistema — nunca acepta un platformUserId de texto libre sin validar (ver
 * docs/UT/HU03/UT-WEB/UT-WEB-HU03-03.md).
 */
export function PlatformUserCombobox({
  value,
  onChange,
  disabled,
  excludeEmails = [],
  portalContainer,
}: PlatformUserComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = usePlatformUsersByRole();

  const accounts = (data?.data ?? []).filter(
    (account) =>
      account.isActive &&
      (account.email === value?.platformUserEmail || !excludeEmails.includes(account.email)),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
        >
          <span className="truncate">{value ? value.platformUserEmail : 'Elegí una cuenta…'}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        className="p-0"
        align="start"
        container={portalContainer ?? undefined}
      >
        <Command>
          <CommandInput placeholder="Buscar por email…" />
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Cargando cuentas…' : 'No hay cuentas Autoridad de Registro disponibles.'}
            </CommandEmpty>
            <CommandGroup>
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.email}
                  onSelect={() => {
                    onChange({ platformUserId: account.id, platformUserEmail: account.email });
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      value?.platformUserId === account.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {account.email}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
