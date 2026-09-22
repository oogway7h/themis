import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Brain, X, Loader2, Users, Activity, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import {
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface ForecastPoint {
  t: number;
  votes: number;
}

interface ForecastResponse {
  electionId: string;
  model: string;
  history: ForecastPoint[];
  projection: ForecastPoint[];
  congestionProjection: ForecastPoint[];
  dropoffProjection: ForecastPoint[];
  projectedTotal: number;
  cap: number;
  winnerProjection: {
    optionId: string;
    nombre: string;
    currentVotes: number;
    projectedVotes: number;
    winProbability: number;
  }[];
}

export function AiForecastModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !forecast) {
      fetchForecast();
    }
  }, [open]);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-token': 'cambiar-por-el-mismo-valor-que-AI_SERVICE_TOKEN-en-themis-core',
        },
        body: JSON.stringify({
          electionId: "auto",
          horizon: 10,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error de la IA: ${response.status}`);
      }

      const data = await response.json();
      setForecast(data);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con themis-ai');
    } finally {
      setLoading(false);
    }
  };

  // DATOS GRÁFICA 1: EMPADRONAMIENTO
  const historyData = (forecast?.history || []).map(p => ({ time: p.t, real: p.votes, predicted: null }));
  const lastReal = historyData.length > 0 ? historyData[historyData.length - 1] : { time: 0, real: null };
  const projectionData = (forecast?.projection || []).map(p => ({ time: p.t, real: null, predicted: p.votes }));
  
  const chartData: { time: number; real: number | null; predicted: number | null }[] = [...historyData];
  if (forecast && historyData.length > 0) {
    chartData.push({ time: lastReal.time, real: null, predicted: lastReal.real });
    chartData.push(...projectionData);
  } else if (forecast) {
    chartData.push(...projectionData);
  }
  
  const currentCap = forecast?.cap || 100;

  // DATOS GRÁFICA 2: CONGESTIÓN
  const congestionData = (forecast?.congestionProjection || []).map(p => ({ time: p.t, congestion: p.votes }));
  const maxCongestion = Math.max(...congestionData.map(d => d.congestion), 1);

  // DATOS GRÁFICA 3: FUGA DE VOTANTES
  const dropoffData = (forecast?.dropoffProjection || []).map((p, index) => {
    const total = forecast?.projection[index]?.votes || 0;
    return {
      time: p.t,
      totalEmpadronados: total,
      votosReales: total - p.votes, // restamos la fuga para obtener la curva de abajo
      fuga: p.votes
    };
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" className="gap-2 rounded-full border-brand/20 bg-brand-soft text-brand hover:bg-brand hover:text-white transition-colors">
          <Brain className="size-4" />
          <span className="hidden sm:inline">Dashboard Predictivo IA</span>
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-[18px]">

          <div className="flex flex-col space-y-1.5 border-b pb-4">
            <div className="flex justify-between items-center pr-8">
              <div>
                <Dialog.Title className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                  <Brain className="size-6 text-brand" />
                  Dashboard Predictivo zk-SNARK
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-1">
                  Análisis multivariable utilizando Prophet (Time-Series Forecasting).
                </Dialog.Description>
              </div>
              <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg border border-border">
                <div className="text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
                  Padrón Calculado: <span className="text-brand text-sm">{forecast?.cap || 0}</span>
                </div>
                <Button size="sm" onClick={fetchForecast} disabled={loading} className="h-7 text-xs bg-brand hover:bg-brand/90 text-white">
                  Recalcular
                </Button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          <div className="py-2 max-h-[70vh] overflow-y-auto pr-2 space-y-8">
            {loading ? (
              <div className="flex h-[300px] flex-col items-center justify-center space-y-4 text-brand">
                <Loader2 className="size-8 animate-spin" />
                <p className="text-sm font-semibold animate-pulse">Calculando modelos logísticos...</p>
              </div>
            ) : error ? (
              <div className="flex h-[300px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
                <p>{error}</p>
              </div>
            ) : forecast ? (
              <>
                {/* TARJETAS RESUMEN */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-4 flex items-center gap-4 bg-brand-soft border-brand/20">
                    <div className="flex size-10 items-center justify-center rounded-full bg-brand text-white">
                      <Users className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-strong uppercase">Turnout Estimado</p>
                      <p className="text-2xl font-extrabold text-brand-strong">{forecast.projectedTotal}</p>
                    </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4 bg-rose-50 border-rose-100">
                    <div className="flex size-10 items-center justify-center rounded-full bg-rose-500 text-white">
                      <Activity className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-rose-700 uppercase">Pico de Red Máximo</p>
                      <p className="text-2xl font-extrabold text-rose-700">{maxCongestion} tx/min</p>
                    </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4 bg-orange-50 border-orange-100">
                    <div className="flex size-10 items-center justify-center rounded-full bg-orange-500 text-white">
                      <AlertTriangle className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-orange-700 uppercase">Votantes Perdidos</p>
                      <p className="text-2xl font-extrabold text-orange-700">{dropoffData[dropoffData.length-1]?.fuga || 0}</p>
                    </div>
                  </Card>
                </div>

                {/* PROYECCIÓN DE GANADOR */}
                {forecast.winnerProjection && forecast.winnerProjection.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Módulo de Predicción de Ganador
                    </h3>
                    <p className="text-xs text-muted-foreground">Proyección del vencedor basada en distribución inercial sobre votos faltantes.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {forecast.winnerProjection.sort((a,b) => b.projectedVotes - a.projectedVotes).map((cand, idx) => (
                        <Card key={cand.optionId} className={`p-4 flex items-center gap-4 transition-all ${idx === 0 ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-300' : 'bg-card border-border opacity-80'}`}>
                          <div className={`flex size-12 items-center justify-center rounded-full text-2xl font-bold shadow-sm ${idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                            {idx === 0 ? '👑' : idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-extrabold text-foreground line-clamp-1">{cand.nombre}</p>
                            <div className="flex justify-between items-end mt-1">
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Votos Proyectados</p>
                                <p className={`text-xl font-black ${idx === 0 ? 'text-amber-700' : 'text-foreground'}`}>{cand.projectedVotes}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Probabilidad</p>
                                <p className={`text-sm font-black ${idx === 0 ? 'text-amber-700' : 'text-foreground'}`}>{cand.winProbability.toFixed(1)}%</p>
                              </div>
                            </div>
                            <div className="mt-2 h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                              <div className={`h-full ${idx === 0 ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ width: `${cand.winProbability}%` }}></div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* GRAFICA 1: EMPADRONAMIENTO */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand"></span>
                    Curva 1: Predicción de Empadronamiento Final
                  </h3>
                  <p className="text-xs text-muted-foreground">Proyección de crecimiento logístico (limitado por el padrón de {currentCap} estudiantes).</p>
                  <div className="h-[250px] w-full border rounded-xl p-4 bg-card shadow-sm">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(val) => `t+${val}`} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} domain={[0, currentCap]} />
                        <Tooltip contentStyle={{ borderRadius: '8px' }} labelFormatter={(l) => `Minuto: ${l}`} />
                        
                        {/* Linea de Quorum del 30% */}
                        <ReferenceLine y={currentCap * 0.3} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Quórum Mínimo (30%)', fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }} />
                        <ReferenceLine x={4} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ position: 'top', value: 'AHORA', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />

                        <Area type="monotone" dataKey="predicted" name="Proyección IA" stroke="#059669" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPredicted)" connectNulls />
                        <Line type="monotone" dataKey="real" name="Registros Reales" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#0f172a" }} connectNulls />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* GRAFICA 2: CONGESTIÓN */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Curva 2: Congestión de Blockchain (Tasa de Llegada)
                  </h3>
                  <p className="text-xs text-muted-foreground">Predicción de cuellos de botella (Nuevos registros generados por minuto).</p>
                  <div className="h-[200px] w-full border rounded-xl p-4 bg-card shadow-sm">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={congestionData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(val) => `t+${val}`} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: '8px' }} cursor={{fill: 'transparent'}} />
                        
                        <Bar dataKey="congestion" name="Nuevas Transacciones" radius={[4, 4, 0, 0]}>
                          {congestionData.map((entry, index) => {
                            // Calor térmico: Verde (bajo), Amarillo (medio), Rojo (alto)
                            const intensity = entry.congestion / maxCongestion;
                            const color = intensity > 0.7 ? '#ef4444' : intensity > 0.4 ? '#f59e0b' : '#10b981';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* GRAFICA 3: FUGA DE VOTANTES */}
                <div className="space-y-3 pb-8">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    Curva 3: Brecha de Fuga de Votantes
                  </h3>
                  <p className="text-xs text-muted-foreground">Diferencia proyectada entre alumnos que se empadronan y alumnos que realmente terminan votando en la blockchain.</p>
                  <div className="h-[250px] w-full border rounded-xl p-4 bg-card shadow-sm">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dropoffData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(val) => `t+${val}`} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: '8px' }} />
                        
                        {/* Curva de abajo (Votos reales emitidos) */}
                        <Area type="monotone" dataKey="votosReales" name="Votos Emitidos" stroke="#0ea5e9" strokeWidth={3} fillOpacity={0.1} fill="#0ea5e9" />
                        
                        {/* Curva de arriba (Empadronados). Al usar fill transparente, vemos el rojo de la brecha usando una técnica visual: 
                            En Recharts no hay 'fillBetween' fácil, así que lo mostramos dibujando ambos. */}
                        <Line type="monotone" dataKey="totalEmpadronados" name="Credenciales (Total)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                        
                        <Line type="monotone" dataKey="fuga" name="Votantes Perdidos" stroke="#f97316" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
