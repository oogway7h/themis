import * as React from 'react';

/** Alto fijo de la fila de encabezado de la tabla + barra de paginación + bordes. */
const TABLE_CHROME_PX = 44 + 56 + 2;
/** Alto de una fila de datos (py-2.5 + botones de acción de 32px + borde). */
const ROW_PX = 53;

/**
 * Calcula cuántas filas caben en el alto disponible del contenedor, para que la
 * tabla paginada entre en una sola pantalla sin scroll vertical. Adjuntar `ref`
 * a un contenedor con altura definida por el layout (`flex-1 min-h-0`).
 */
export function useFitPageSize(min = 3) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const measure = () => {
      // Sin layout (elemento oculto o sin altura): conservar el tamaño actual.
      if (element.clientHeight === 0) {
        return;
      }
      const rows = Math.floor((element.clientHeight - TABLE_CHROME_PX) / ROW_PX);
      setPageSize(Math.max(min, rows));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [min]);

  return { ref, pageSize };
}
