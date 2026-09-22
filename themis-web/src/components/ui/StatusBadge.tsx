interface StatusBadgeProps {
  ok: boolean;
  label: string;
}

export function StatusBadge({ ok, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
        ok
          ? 'bg-success-soft text-success'
          : 'bg-destructive/10 text-destructive'
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${ok ? 'bg-brand' : 'bg-destructive'}`}
      />
      {label}: {ok ? 'conectado' : 'sin conexion'}
    </span>
  );
}
