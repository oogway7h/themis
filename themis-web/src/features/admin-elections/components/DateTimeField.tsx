import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Formato interno: 'YYYY-MM-DDTHH:mm', el mismo que producía
// <input type="datetime-local">, para no tocar el schema ni los helpers
// toIso()/toDatetimeLocal() de ElectionFormDrawer.

interface ParsedValue {
  date: Date | undefined;
  hour: string;
  minute: string;
}

function parseValue(value: string): ParsedValue {
  if (!value) {
    return { date: undefined, hour: '00', minute: '00' };
  }
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = (timePart ?? '00:00').split(':');
  return { date: new Date(year, month - 1, day), hour, minute };
}

function formatValue(date: Date, hour: string, minute: string): string {
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hour}:${minute}`;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0'));

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export interface DateTimeFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  /**
   * Nodo del Drawer donde portar el Popover — si este campo vive dentro de un
   * Drawer (vaul), hay que pasarlo o el clic en el calendario cierra el
   * Drawer entero (ver comentario en components/ui/popover.tsx).
   */
  portalContainer?: HTMLElement | null;
}

/**
 * Selector de fecha y hora propio (Popover + Calendar de shadcn/ui, sin
 * <input type="datetime-local"> nativo) — el nativo solo abre el calendario
 * si el clic cae justo en su ícono, y su estilo no se puede personalizar de
 * forma consistente entre navegadores.
 */
export function DateTimeField({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  placeholder = 'Elegí fecha y hora',
  portalContainer,
}: DateTimeFieldProps) {
  const [open, setOpen] = React.useState(false);
  const { date, hour, minute } = parseValue(value);

  function handleSelectDate(nextDate: Date | undefined) {
    if (!nextDate) {
      return;
    }
    onChange(formatValue(nextDate, hour, minute));
  }

  function handleHourChange(nextHour: string) {
    onChange(formatValue(date ?? new Date(), nextHour, minute));
  }

  function handleMinuteChange(nextMinute: string) {
    onChange(formatValue(date ?? new Date(), hour, nextMinute));
  }

  const label = date ? `${DATE_LABEL_FORMATTER.format(date)}, ${hour}:${minute}` : placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          onBlur?.();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid}
          className={cn('w-full justify-start font-normal', !date && 'text-muted-foreground')}
        >
          <CalendarIcon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        container={portalContainer ?? undefined}
      >
        <Calendar mode="single" selected={date} onSelect={handleSelectDate} autoFocus />
        <div className="flex items-center gap-2 border-t p-3">
          <span className="text-sm text-muted-foreground">Hora</span>
          <select
            className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
            value={hour}
            disabled={!date}
            onChange={(event) => handleHourChange(event.target.value)}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">:</span>
          <select
            className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
            value={minute}
            disabled={!date}
            onChange={(event) => handleMinuteChange(event.target.value)}
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            disabled={!date}
            onClick={() => setOpen(false)}
          >
            Listo
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
