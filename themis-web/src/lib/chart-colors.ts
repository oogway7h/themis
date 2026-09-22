// Paleta categorica para graficos de opciones/candidatos (dashboard de
// resultados CU-11 y dashboard de auditoria CU-15) -- separada del teal de
// marca (reservado para "en vivo"/chrome) para no confundir "marca" con
// "opcion". Se cicla si una eleccion tiene mas de 4 opciones.
export const CHART_COLORS = [
  { cssVar: '--chart-1', bg: 'bg-chart-1', soft: 'bg-chart-1-soft', text: 'text-chart-1' },
  { cssVar: '--chart-2', bg: 'bg-chart-2', soft: 'bg-chart-2-soft', text: 'text-chart-2' },
  { cssVar: '--chart-3', bg: 'bg-chart-3', soft: 'bg-chart-3-soft', text: 'text-chart-3' },
  { cssVar: '--chart-4', bg: 'bg-chart-4', soft: 'bg-chart-4-soft', text: 'text-chart-4' },
] as const;

export function chartColorFor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}
